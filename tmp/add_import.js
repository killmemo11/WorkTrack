const fs = require('fs');
const f = '/home/hrmohamedyehia/WorkTrack/frontend/src/App.jsx';
let c = fs.readFileSync(f, 'utf8');
c = 'import "./TestComponent.css";\n' + c;
fs.writeFileSync(f, c);
console.log('Done');