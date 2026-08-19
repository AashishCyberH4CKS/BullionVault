const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const Commodity = require('../models/Commodity');
const HistoricalPrice = require('../models/HistoricalPrice');
const SystemLog = require('../models/SystemLog');

// Map headers to normalized fields
const HEADER_MAP = {
  'state / ut': 'state',
  'state': 'state',
  'ut': 'state',
  'coverage': 'state',
  'location': 'state',
  'region': 'region',
  'zone': 'region',
  'quarter': 'quarter',
  'period': 'quarter',
  'qtr': 'quarter',
  'karat': 'purity',
  'purity': 'purity',
  'grade': 'purity',
  'silver purity': 'purity',
  'platinum purity': 'purity',
  'unit': 'purity',
  'weight (g)': 'weight',
  'weight': 'weight',
  'weight (grams)': 'weight',
  'mass': 'weight',
  'price (inr)': 'price',
  'price': 'price',
  'rate': 'price',
  'qoq change (inr)': 'qoqChange',
  'qoq change': 'qoqChange',
  'qoq change (usd/barrel)': 'qoqChange',
  'qoq change (%)': 'qoqChangePercent',
  'qoq change percent': 'qoqChangePercent',
  'qoq %': 'qoqChangePercent',
  'trend': 'trend',
  'direction': 'trend'
};

// Map commodity code to theme configs
const THEME_MAP = {
  gold: {
    color: '#FFD700',
    bgGradient: 'linear-gradient(135deg, #111 0%, #292524 100%)',
    chartColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.4)'
  },
  silver: {
    color: '#94A3B8',
    bgGradient: 'linear-gradient(135deg, #111 0%, #1E293B 100%)',
    chartColor: '#CBD5E1',
    glowColor: 'rgba(148, 163, 184, 0.4)'
  },
  platinum: {
    color: '#CBD5E1',
    bgGradient: 'linear-gradient(135deg, #111 0%, #334155 100%)',
    chartColor: '#F8FAFC',
    glowColor: 'rgba(203, 213, 225, 0.4)'
  },
  crudeoil: {
    color: '#F97316',
    bgGradient: 'linear-gradient(135deg, #111 0%, #431407 100%)',
    chartColor: '#EA580C',
    glowColor: 'rgba(249, 115, 22, 0.4)'
  },
  copper: {
    color: '#B87333',
    bgGradient: 'linear-gradient(135deg, #111 0%, #3B2314 100%)',
    chartColor: '#B87333',
    glowColor: 'rgba(184, 115, 51, 0.4)'
  }
};

const getDefaultTheme = (code) => {
  return THEME_MAP[code] || {
    color: '#10B981',
    bgGradient: 'linear-gradient(135deg, #111 0%, #064E3B 100%)',
    chartColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.4)'
  };
};

const normalizeValue = (val) => {
  if (val === undefined || val === null || val === 'None' || val === 'null' || val === '-') {
    return null;
  }
  if (typeof val === 'string') {
    // Clean string percentages
    if (val.endsWith('%')) {
      const parsed = parseFloat(val.replace('%', ''));
      return isNaN(parsed) ? null : parsed;
    }
    // Clean currency and special chars
    const cleaned = val.replace(/[₹$,\s]/g, '');
    if (!isNaN(cleaned) && cleaned !== '') {
      return parseFloat(cleaned);
    }
  }
  return val;
};

const importWorkbook = async (filePath) => {
  const fileName = path.basename(filePath);
  const commodityName = fileName.replace('.xlsx', '').replace(/([A-Z])/g, ' $1').trim();
  const commodityCode = fileName.replace('.xlsx', '').toLowerCase().replace(/[^a-z0-9]/g, '');

  console.log(`Starting import for ${commodityName} from ${fileName}...`);

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    
    // Find the Full Data sheet
    const fullDataSheetName = sheetNames.find(name => name.toLowerCase().includes('full data'));
    if (!fullDataSheetName) {
      throw new Error(`Workbook ${fileName} does not contain a "Full Data" sheet.`);
    }

    const sheet = workbook.Sheets[fullDataSheetName];
    // Convert to JSON with empty values represented as null
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
    
    if (rows.length === 0) {
      throw new Error(`"Full Data" sheet in ${fileName} is empty.`);
    }

    // Step 1: Ensure the Commodity exists
    let commodity = await Commodity.findOne({ code: commodityCode });
    if (!commodity) {
      commodity = new Commodity({
        name: commodityName,
        code: commodityCode,
        fileName: fileName,
        accentTheme: getDefaultTheme(commodityCode)
      });
    }

    const pricesToUpsert = [];
    const uniquePurities = new Set();
    const uniqueWeights = new Set();
    const uniqueStates = new Set();
    const uniqueRegions = new Set();

    // Step 2: Normalize and batch the rows
    for (const row of rows) {
      const normalizedRow = {};
      
      // Map columns
      for (const [key, val] of Object.entries(row)) {
        const cleanedKey = key.toLowerCase().trim();
        const mappedField = HEADER_MAP[cleanedKey];
        if (mappedField) {
          normalizedRow[mappedField] = normalizeValue(val);
        }
      }

      // Skip invalid rows
      if (!normalizedRow.price || !normalizedRow.quarter) {
        continue;
      }

      // Set default values for missing dimensions
      normalizedRow.state = normalizedRow.state || 'National';
      normalizedRow.region = normalizedRow.region || 'National';
      normalizedRow.purity = normalizedRow.purity || 'Standard';
      normalizedRow.weight = normalizedRow.weight !== undefined && normalizedRow.weight !== null ? Number(normalizedRow.weight) : 1;

      // Extract Year and Quarter Index
      let year = 2022;
      let quarterNum = 1;
      const qStr = String(normalizedRow.quarter).trim();
      const parts = qStr.split(/\s+/);
      if (parts.length >= 2) {
        year = parseInt(parts[1], 10) || 2022;
        const qMatch = parts[0].match(/\d+/);
        if (qMatch) {
          quarterNum = parseInt(qMatch[0], 10) || 1;
        }
      } else {
        // Fallback checks
        const yrMatch = qStr.match(/\d{4}/);
        if (yrMatch) year = parseInt(yrMatch[0], 10);
        const qMatch = qStr.match(/Q\d/i);
        if (qMatch) quarterNum = parseInt(qMatch[0].replace(/Q/i, ''), 10);
      }

      // Update sets for Commodity metadata
      uniquePurities.add(String(normalizedRow.purity));
      uniqueWeights.add(Number(normalizedRow.weight));
      uniqueStates.add(String(normalizedRow.state));
      uniqueRegions.add(String(normalizedRow.region));

      pricesToUpsert.push({
        commodityCode,
        state: normalizedRow.state,
        region: normalizedRow.region,
        quarter: qStr,
        year,
        quarterNum,
        purity: String(normalizedRow.purity),
        weight: Number(normalizedRow.weight),
        price: Number(normalizedRow.price),
        qoqChange: normalizedRow.qoqChange !== null ? Number(normalizedRow.qoqChange) : null,
        qoqChangePercent: normalizedRow.qoqChangePercent !== null ? Number(normalizedRow.qoqChangePercent) : null,
        trend: normalizedRow.trend || 'Unknown'
      });
    }

    // Step 3: Perform Bulk Write to avoid duplicate entries and improve speed
    if (pricesToUpsert.length > 0) {
      const bulkOps = pricesToUpsert.map(priceDoc => {
        const query = {
          commodityCode: priceDoc.commodityCode,
          state: priceDoc.state,
          quarter: priceDoc.quarter,
          purity: priceDoc.purity,
          weight: priceDoc.weight
        };

        const updateDoc = {
          ...priceDoc,
          commodityId: commodity._id,
          importedAt: new Date()
        };

        return {
          updateOne: {
            filter: query,
            update: { $set: updateDoc },
            upsert: true
          }
        };
      });

      const writeResult = await HistoricalPrice.bulkWrite(bulkOps);
      console.log(`Bulk Upsert completed for ${commodityName}: matched ${writeResult.matchedCount}, upserted ${writeResult.upsertedCount}, modified ${writeResult.modifiedCount}`);

      // Update commodity metadata
      commodity.purities = Array.from(uniquePurities);
      commodity.weights = Array.from(uniqueWeights).sort((a, b) => a - b);
      commodity.states = Array.from(uniqueStates);
      commodity.regions = Array.from(uniqueRegions);
      commodity.lastImportedAt = new Date();
      await commodity.save();

      // Log success
      await SystemLog.create({
        type: 'import',
        message: `Successfully imported ${commodityName} dataset`,
        details: {
          file: fileName,
          recordsCount: pricesToUpsert.length,
          matchedCount: writeResult.matchedCount,
          upsertedCount: writeResult.upsertedCount,
          modifiedCount: writeResult.modifiedCount,
          purities: commodity.purities,
          weights: commodity.weights
        }
      });
    }

    return {
      success: true,
      commodityName,
      recordsCount: pricesToUpsert.length
    };

  } catch (error) {
    console.error(`Error importing ${fileName}: ${error.message}`);
    await SystemLog.create({
      type: 'error',
      message: `Failed to import ${commodityName} from ${fileName}`,
      details: {
        error: error.message,
        stack: error.stack
      }
    });
    throw error;
  }
};

const runImportEngine = async () => {
  console.log("Excel Import Engine started scanning datasets...");
  const datasetsDir = path.join(__dirname, '../../datasets');
  const uploadsDir = path.join(__dirname, '../../uploads');

  // Ensure folders exist
  if (!fs.existsSync(datasetsDir)) {
    fs.mkdirSync(datasetsDir, { recursive: true });
  }
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const results = [];
  
  // Read both datasets and uploads directories
  const dirs = [datasetsDir, uploadsDir];
  const processedFiles = new Set(); // Avoid importing identical filenames twice if present in both dirs

  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
      
      for (const file of files) {
        if (processedFiles.has(file)) continue;
        
        const filePath = path.join(dir, file);
        try {
          const res = await importWorkbook(filePath);
          results.push(res);
          processedFiles.add(file);
        } catch (e) {
          console.error(`Skipped import for file ${file}: ${e.message}`);
        }
      }
    } catch (err) {
      console.error(`Error scanning directory ${dir}: ${err.message}`);
    }
  }

  console.log(`Excel Import Engine finished. Processed ${results.length} workbooks successfully.`);
  return results;
};

module.exports = {
  runImportEngine,
  importWorkbook
};
