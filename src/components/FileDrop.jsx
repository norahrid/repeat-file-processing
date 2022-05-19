import React, { useState } from "react";
import Dropzone from 'react-dropzone';
import _ from "lodash";
import { saveAs } from 'file-saver';
import getFileByPath from "../helpers/getFileByPath";
import categorizeFile from "../helpers/categorizeFile";
import { getCompleteData, getReferenceMap, getContigMapping, matchUnitigsToChromosomes } from "../helpers/processDataHelpers";
import { scaleChromosomeData, formatDataIntoObject } from "../helpers/formatDataHelpers";

const FileDrop = () => {

    const [fileList, setFileList] = useState([]);
    
    // need: ler_complete.tsv, ler_intact.gff3, ler.agp, ler_contigs.agp

    const onProcessFile = async () => {
        let uploadedDocuments = {}
        if (fileList.length > 0) {
            for (const [fileIndex, file] of fileList.entries()) {
                const fileContents = await getFileByPath(file);

                //turn this into a promise
                let decoder = new TextDecoder();
                let data = decoder.decode(fileContents);
                let classify = categorizeFile(file.name);
                uploadedDocuments[classify] = {"name": file.name,
                                                "data": data
                                            }
            }
        }
        const { complete, contig, intact, general } = uploadedDocuments;
        const processedCompleteData = getCompleteData(complete);
        const referenceMap = getReferenceMap(general);
        const contigMap = getContigMapping(contig, referenceMap);
        const mapped = matchUnitigsToChromosomes(intact, processedCompleteData, contigMap);

        const remapped = scaleChromosomeData(mapped);
        const finalData = formatDataIntoObject(remapped);

        // Create a blob of the data
        var fileToSave = new Blob([JSON.stringify(finalData)], {
            type: 'application/json'
        })
        saveAs(fileToSave, 'processedGenomeData.json');
    }

    return (
    <div className="App">
        <Dropzone onDrop={fileList => setFileList(fileList)}>
            {({getRootProps, getInputProps}) => (
            <section>
                <div {...getRootProps()}>
                <input {...getInputProps()} />
                <p>Drag and drop here</p>
                </div>
            </section>
            )}
        </Dropzone>
        <button onClick={onProcessFile}>
            <span>{"PROCESS"}</span>
        </button>

  </div>
 
  );
};

export default FileDrop;
