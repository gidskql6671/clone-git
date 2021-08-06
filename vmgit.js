const io = require("./console_io.js");
const Git = require("./git.js");


async function vmgit(){
    const git = new Git({gitName: ".mygit"});
    
    while(true){
        const input = await io.getLine();
        
        if (input.match(/^init\s*$/g)){
            git.init();
        }
        else if (input.match(/^status\s*$/g)){
            git.status();
        }
        else if (input.startsWith("checkout ")){
            console.log("미구현");
            continue;
            
            let repoName = input.split(' ')[1];
            if (repoName.length === 0){
                console.log("[Usage] checkout <commitId|branch>");
                continue;
            }
            
            git.checkout(repoName);
        }
        else if (input.startsWith("add ")){
            let filename = input.split(' ')[1];
            if (typeof filename === "undefined" || filename.length === 0){
                filename = "";
            }
            
            git.add(filename);
        }
        else if (input.startsWith("commit ")){
            const [_, ...messageArray] = input.split(' ');
            const message = messageArray.join(' ');
            
            git.commit(message);
        }
        else if (input === "log"){
            git.log();
        }
        else if (input === "exit"){
            return;
        }
        else{
            console.log("유효하지 않은 명령입니다.");
        }
        
        console.log();
    }
};

module.exports = vmgit;