import _ from "lodash";
import { scaleLinear } from "d3";

export const scaleChromosomeData = (referenceMap) => {
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

export const formatDataIntoObject = (data) => {
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

