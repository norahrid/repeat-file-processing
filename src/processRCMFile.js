import { read, utils } from 'xlsx';
import _ from 'lodash';


export default function (rawData) {
    return new Promise((resolve, reject) => {
        try {
            var workbook = read((new Uint8Array(rawData)), {
                type: 'array'
            }),
                
                epa_codes = utils.sheet_to_json(workbook.Sheets['EPA_CODES']),
                epa_assessments = utils.sheet_to_json(workbook.Sheets['EPA_ASSESSMENTS']);
            resolve({
                workbook
            });
        } catch (e) { reject() };
    })
}