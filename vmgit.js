const io = require("./console_io.js");
const Git = require("./git.js");


async function vmgit(){
    const git = new Git({localPath: "local"});
    
    while(true){
        const input = await io.getLine(git.getCurLocalRepoName());
        
        if (input.startsWith("init")){
            const repoName = input.split(' ')[1];
            if (typeof repoName === "undefined" || repoName.length === 0){
                console.log("[Usage] init <Repo Name>");
                continue;
            }
            
            git.init(repoName);
        }
        else if (input === "status remote"){
            git.statusRemote();
        }
        else if (input.startsWith("status ") || input === "status"){
            git.status();
        }
        else if (input.startsWith("checkout ") || input === "checkout"){
            let repoName = input.split(' ')[1];
            if (typeof repoName === "undefined" || repoName.length === 0){
                repoName = "";
            }
            
            git.checkout(repoName);
        }
        else if (input.startsWith("new ")){
            const [_, filename, ...contentArray] = input.split(' ');
            const content = contentArray.join(' ');
            
            git.makeFile(filename, content);
        }
        else if (input.startsWith("update ")){
            const [_, filename, ...contentArray] = input.split(' ');
            const content = contentArray.join(' ');
            
            git.updateFile(filename, content);
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
        else if (input === "push"){
            git.push();
        }
        else if (input === "export"){
            git.export();
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