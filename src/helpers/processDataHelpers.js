import _ from "lodash";

export const getCompleteData = (fileData) => {
    const { data } = fileData;

    let lines = data.split("\n").slice(1);
    let completeData = lines.reduce((data, line) => {
        let id = line.split("\t")[0].split("#")[0];
        data[id] = line.split("\t")[4];
        return data;
    }, {});

    return completeData;
}

export const getReferenceMap = (fileData) => {
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

export const getContigMapping = (contigData, tempReferenceMap) => {
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

export const matchUnitigsToChromosomes = (intactData, completeData, referenceMap) => {
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

