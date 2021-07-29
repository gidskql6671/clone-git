const readline = require("readline");



exports.getLine = (prompt="") => new Promise((resolve, reject) => {
    const rl = readline.createInterface({
        input: process.stdin
    });
    process.stdout.write(`${prompt}/> `);
    
    let result;
    
    rl.on("line", (line) => {
        result = line;
        rl.close()
    })
    .on("close", () => {
        resolve(result);
    });
})
