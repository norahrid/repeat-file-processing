import React, { useState } from "react";
import Dropzone from 'react-dropzone';
import _ from "lodash";
import { scaleLinear } from "d3";
import processRCMFile from "./processRCMFile";

const FileDrop = (props) => {

    const [fileList, setFileList] = useState([]);
    
    const getFileByPath = (file, nonArrayType = false) => {
        return new Promise(function(resolve, reject) {
            let reader = new FileReader();
            reader.onload = (event) => {
                resolve(event.target.result);
            }
            reader.onerror = () => {
                reject();
            }
            if (file) {
                if (nonArrayType) {
                    reader.readAsText(file);
                } else {
                    reader.readAsArrayBuffer(file);
                }
    
            } else {
                reject();
            }
        });
    }

    const getCompleteData = (fileData) => {
        const { data } = fileData;

        let lines = data.split("\n").slice(1);
        let completeData = lines.reduce((data, line) => {
            let id = line.split("\t")[0].split("#")[0];
            data[id] = line.split("\t")[4];
            return data;
        }, {});

        return completeData;
    }

    const getReferenceMap = (fileData) => {
        const { data } = fileData;
        const referenceMap = data
            .trim()
            .split("\n")
            .filter((d) => d.trim().indexOf("#") == -1)
            .map((e) => e.split("\t"))
            .filter((g) => g[4] == "W")
            .map((f) => {
                let contigID = f[5].split(".")[2];
                // if (genome === "LENS_TOMENTOSUS") contigID = f[5].split(".").slice(2, 4).join("");
                // else contigID = f[5].split(".")[2];
                //console.log(f)
                return {
                    chromosomeID: f[0],
                    chromosomeStart: +f[1],
                    chromosomeEnd: +f[2],
                    // example: "Lcu.2RBY.unitig3317" first split by . and then get the third element
                    contigID: contigID,
                    contigStart: +f[6],
                    contigEnd: +f[7],
                };
            });

        const AGPReferenceMap = referenceMap.reduce(
        (entryMap, e) =>
            entryMap.set(e.contigID, [...(entryMap.get(e.contigID) || []), e]),
        new Map()
        );
        return AGPReferenceMap;
    }

    const getContigMapping = (contigData, tempReferenceMap) => {
        const { data } = contigData;
        let linesContigs = data
            .trim()
            .split("\n")
            .map((e) => e.split("\t"))
            .map((f) => {
                let unitigID = f[0].split(".").slice(2, 4).join("");
                let newUnitigID = f[5];
                // Get the alias for the unitig so we can match unitig to chromosome later
                return {
                    ...tempReferenceMap.get(unitigID)[0],
                    componentID: newUnitigID,
                };
            });
      const AGPReferenceMap = linesContigs.reduce(
        (entryMap, e) =>
          entryMap.set(e.componentID, [
            ...(entryMap.get(e.contigID) || []),
            e,
          ]),
        new Map()
      );
      return AGPReferenceMap;
    }

    const matchUnitigsToChromosomes = (intactData, completeData, referenceMap) => {
        const { data } = intactData;
        let gffLines = data
            .trim()
            .split("\n")
            .map((e) => e.split("\t"))
            .map((f) => {
                let AGPmap;
                let unitigId = f[8].split("#")[0].split("=")[1];
                try {
                    if (f[0].includes("|")) {
                        // handle the strange formatting with some data
                        let id = f[0].split("|");
                        if (id.length === 1) id = id[0];
                        else if (id.length > 1) id = id[1];
                        // check that the unitigs match up
                        if (referenceMap.has(id)) {
                        AGPmap = referenceMap.get(id)[0] || {};
                        }
                        else return;
                    }
                    else {
                        AGPmap = referenceMap.get(f[0])[0] || {};
                    }
                    return [
                    AGPmap.chromosomeID,
                    AGPmap.chromosomeStart,
                    AGPmap.chromosomeEnd,
                    ...f,
                    completeData[unitigId],
                    ]
                }
                catch (e) {
                    console.log("Error matching unitig to chromosome.");
                }
            });
        return gffLines
    }

    const scaleChromosomeData = (referenceMap) => {
        // Filters out the undefined elements from when unitig ids don't match up
        let filteredData = referenceMap.filter(r => typeof(r) !== "undefined");
        let groups = _.groupBy(filteredData, (d) => d[0]);
        let chromosomeKeys = _.keys(groups);
        chromosomeKeys = _.keys(groups).filter(
          (d) => d.indexOf("unitig") == -1 && d !== ""
        );
    
        let lineStore = [];
    
        _.each(chromosomeKeys, (d) => {
          let chromosomeData = groups[d];
          let sortedChromosomeData = _.sortBy(
            _.sortBy(chromosomeData, (e) => +e[2]),
            (d) => +d[1]
          );
    
          let chromosomeDataGroupByStart = _.groupBy(
            sortedChromosomeData,
            (d) => +d[1]
          );
    
          _.each(chromosomeDataGroupByStart, (groupArray) => {
            let unitigMinimum = _.minBy(groupArray, (d) => +d[6])[6];
            let unitigMaximum = _.maxBy(groupArray, (d) => +d[7])[7];
    
            let chromosomeGroupStart = groupArray[0][1],
              chromosomeGroupEnd = groupArray[0][2];
    
            var mappingScaleFunction = scaleLinear()
              .domain([+unitigMinimum, +unitigMaximum])
              .range([+chromosomeGroupStart, +chromosomeGroupEnd]);
    
            _.each(groupArray, (line) => {
              line[6] = Math.round(mappingScaleFunction(+line[6]));
              line[7] = Math.round(mappingScaleFunction(+line[7]));
              lineStore.push(line);
            });
          });
        });
        return lineStore;
    }

    const formatDataIntoObject = (data) => {
        // Remove non-chromosome labels
        let newData = data.filter(d => d[0].split(".")[2].slice(0, 3) === "Chr")
        // Get clade and format line data into an object
        let formatted = newData.map(d => {
            return {
                chromosome: d[0],
                unitig: d[3],
                start: +d[6],
                end: +d[7],
                clade: d[11].split(";")[2].split("=")[1],
                complete: d[d.length-1].trim()
            }
        })
        // Group by chromsome
        let groups = _.groupBy(formatted, (d) => d.chromosome);
    
        let finalData = {}
        _.each(groups, (val, key) => {
            let sortByEnd = _.sortBy(val, v => v.end);
            let sortByStart = _.sortBy(sortByEnd, v => v.start);
            finalData[key] = sortByStart
        });
        return finalData;
    }

    // need:
    // ler_complete.tsv
    // ler_intact.gff3
    // ler.agp
    // ler_contigs.agp

    const categorizeFile = (filename) => {
        const extension = filename.split(".").pop();
        if (extension === "tsv") return "complete";
        else if (extension === "gff3") return "intact";
        else if (extension === "agp") {
            if (filename.includes("contigs")) return "contig";
            else return "general";
        }
        else return null;
    }

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

        console.log(finalData)
        
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
