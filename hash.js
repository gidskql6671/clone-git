
exports.hash = (str) => {
    const lineStr = str.split(/\s/).join("");
    
    if (lineStr.length <= 40)
        return lineStr.padStart(40, '0');
    
    return Array.from(lineStr).reduce((prev, cur, index) => {
        if (index % 2 === 0)
            return prev + cur;
        return prev;
    }, "")
}