const fs = require("fs");
const f = "/home/hrmohamedyehia/WorkTrack/frontend/src/main.jsx";
let c = fs.readFileSync(f, "utf8");
c = c.replace(/import ['"].*platform\.css['"];?\n?/g, "");
c = c.replace("import './App.css';", "import './App.css';\nimport './shared/styles/platform.css';");
fs.writeFileSync(f, c);
console.log("Done");