import _ from "lodash";
import { map, scaleLinear } from "d3";

export const processGenomeData = async (genome) => {
    let mapped;
    if (genome === "LENS_CULINARIS") {
        try {
            let completeData = await getCompleteData("data/lc_complete.tsv")
                .then(result => result);
            //let newCompleteData = await completeData.then(result => result);
            let AGPReferenceMap = getReferenceMap(genome, "data/lc.agp");
            let refMap = await AGPReferenceMap.then(result => result);
            console.log(refMap)
            let newResult = matchUnitigsToChromosomes(genome, "data/lc_intact.gff3", completeData, refMap);
            mapped = await newResult.then(result => result);
        }
        catch(e) {
            console.log("ERROR in Lcu try/catch: ", e);
        }    
    }
    else if (genome === "LENS_TOMENTOSUS") {
        let completeData = await getCompleteData("data/lto_complete.tsv")            
        .then(result => result);
        let AGPReferenceMap = await getReferenceMap(genome, "data/lto.agp")
            .then(result => result);
        let contigMapping = await getContigMapping("data/lto_contigs.agp", AGPReferenceMap)
            .then(result => result);
        mapped = await matchUnitigsToChromosomes(genome, "data/lto_intact.gff3", completeData, contigMapping)
            .then(result => result);
    }

    let remapped = scaleChromosomeData(mapped);
    return formatDataIntoObject(remapped);
}

const getCompleteData = (tsvFile) => {
    let finalResult = fetch(tsvFile)
    .then((response) => response.text())
    .then((completeContent) => {
        let lines = completeContent.split("\n").slice(1);
        let completeData = lines.reduce((data, line) => {
            let id = line.split("\t")[0].split("#")[0];
            data[id] = line.split("\t")[4];
            return data;
        }, {})
        return completeData;
    })
    .catch((error) => {
        console.log("ERROR: ", error);
    });
    return finalResult;
}

const getReferenceMap = (genome, agpFile) => {
    // Fetch the AGP file and parse it into an reference map object
    let result = fetch(agpFile)
    .then((response) => response.text())
    .then((agpContent) => {
        const referenceMap = agpContent
        .trim()
        .split("\n")
        .filter((d) => d.trim().indexOf("#") == -1)
        .map((e) => e.split("\t"))
        .filter((g) => g[4] == "W")
        .map((f) => {
            let contigID;
            if (genome === "LENS_TOMENTOSUS") contigID = f[5].split(".").slice(2, 4).join("");
            else contigID = f[5].split(".")[2];
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
    })
    .catch((error) => {
        console.log("ERROR: ", error);
    });

    return result;
}

const matchUnitigsToChromosomes = (genome, gffFile, completeData, referenceMap) => {
    // Once the AGP reference map is ready, fetch the gff file
    let result = fetch(gffFile)
    .then((response) => response.text())
    .then((intactGFF) => {
        let gffLines = intactGFF
        .trim()
        .split("\n")
        .map((e) => e.split("\t"))
        .map((f) => {
            let AGPmap;
            let unitigId = f[8].split("#")[0].split("=")[1];
            if (genome === "LENS_TOMENTOSUS") {
                // handle the strange formatting with Lto data
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
            //console.log("agp map" , AGPmap)
            
            // example props in a AGP map entry
            // chromosomeEnd: 318712989
            // chromosomeID: "Lcu.2RBY.Chr7"
            // chromosomeStart: 309268626
            // contigEnd: 1
            // contigID: "unitig0001"
            // contigStart: 1
            return [
            AGPmap.chromosomeID,
            AGPmap.chromosomeStart,
            AGPmap.chromosomeEnd,
            ...f,
            completeData[unitigId],
            ]
        });
        return gffLines
    })
    .catch((error) => {
        console.log("ERROR: ", error);
    });
    return result;
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

const getContigMapping = (agpContigFile, tempReferenceMap) => {
    let result = fetch(agpContigFile)
    .then((response) => response.text())
    .then((contigContent) => {
      let linesContigs = contigContent
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
    })
    .catch((error) => {
        console.log("ERROR: ", error);
    });
    return result;
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
