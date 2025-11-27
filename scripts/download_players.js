import fs from 'fs';
import path from 'path';
import pkg from 'follow-redirects';
const { https } = pkg;
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://raw.githubusercontent.com/chadwickbureau/register/master/data/';
const OUTPUT_FILE = path.join(__dirname, '../src/data/players.csv');
const FILES = [
    'people-0.csv', 'people-1.csv', 'people-2.csv', 'people-3.csv', 'people-4.csv',
    'people-5.csv', 'people-6.csv', 'people-7.csv', 'people-8.csv', 'people-9.csv',
    'people-a.csv', 'people-b.csv', 'people-c.csv', 'people-d.csv', 'people-e.csv', 'people-f.csv'
];

const downloadFile = (filename) => {
    return new Promise((resolve, reject) => {
        https.get(BASE_URL + filename, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
                return;
            }
            let data = '';
            response.on('data', (chunk) => data += chunk);
            response.on('end', () => resolve(data));
            response.on('error', (err) => reject(err));
        });
    });
};

const main = async () => {
    console.log('Starting download of player data...');
    const headers = 'key_uuid,key_mlbam,name_last,name_first,name_given,name_suffix,name_matrilineal,name_nick,birth_year,birth_month,birth_day,death_year,death_month,death_day,pro_played_first,pro_played_last,mlb_played_first,mlb_played_last,col_played_first,col_played_last,pro_managed_first,pro_managed_last,mlb_managed_first,mlb_managed_last,col_managed_first,col_managed_last,pro_umpired_first,pro_umpired_last,mlb_umpired_first,mlb_umpired_last,bat_thro,misc_bio_id,misc_bref_id,misc_fan_id,misc_retro_id,misc_spotrac_id,misc_davenport_id,misc_cbs_id,misc_espn_id,misc_yahoo_id,misc_nfbc_id,misc_bis_id,misc_lahman_id,misc_stats_id,misc_kbo_id,misc_npb_id,misc_wikidata_id\n';

    let combinedData = headers;

    for (const file of FILES) {
        try {
            console.log(`Downloading ${file}...`);
            const data = await downloadFile(file);
            // Remove header from individual files (assuming first line is header)
            const lines = data.split('\n');
            if (lines.length > 0) {
                // Check if first line is header (it usually is for these files)
                // We'll skip the first line for all files to be safe and use our own header
                const content = lines.slice(1).join('\n');
                combinedData += content + '\n';
            }
        } catch (error) {
            console.error(`Error downloading ${file}:`, error.message);
        }
    }

    // Ensure directory exists
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, combinedData);
    console.log(`Successfully merged player data to ${OUTPUT_FILE}`);
};

main();
