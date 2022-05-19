export default (filename) => {
    const extension = filename.split(".").pop();
    if (extension === "tsv") return "complete";
    else if (extension === "gff3") return "intact";
    else if (extension === "agp") {
        if (filename.includes("contigs")) return "contig";
        else return "general";
    }
    else return null;
}