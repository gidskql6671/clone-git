
exports.hash = (str) => {
    if (str.length <= 40)
        return str.padStart(40, '0');
    
    return Array.from(str).reduce((prev, cur, index) => {
        if (index % 2 == 0)
            return prev + cur;
        return prev;
    }, "")
}