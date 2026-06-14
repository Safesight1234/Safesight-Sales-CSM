const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSXNWmYIOdt1L9BptFGEZPIPrNumIzgm6Nc74P-fQtkwFOsIq89OLQe7NWNKDNK5TqBw9MdsaHMVL-K/pub?gid=1113282903&single=true&output=csv';
function parseCsvLine(line){const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(q){if(c==='"'){if(line[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=c;}else{if(c===','){out.push(cur);cur='';}else if(c==='"')q=true;else cur+=c;}}out.push(cur);return out;}
function parseNum(s){if(s==null)return 0;s=String(s).replace(/[^0-9.,-]/g,'');if(!s)return 0;const lc=s.lastIndexOf(','),ld=s.lastIndexOf('.');const dec=lc>ld?',':(ld>lc?'.':'');if(dec){const thou=dec===','?'.':',';s=s.split(thou).join('').replace(dec,'.');}return parseFloat(s)||0;}
exports.handler = async function(){
  try{
    const res = await fetch(SHEET_CSV,{redirect:'follow'});
    if(!res.ok) throw new Error('sheet '+res.status);
    const rows = (await res.text()).split(/\r?\n/).map(parseCsvLine);
    const row6 = rows[5]||[];
    return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=600'},
      body:JSON.stringify({arrTotal:parseNum(row6[2]),totalSafesight:parseNum(row6[11]),raw:{c6:row6[2]||null,l6:row6[11]||null}})};
  }catch(e){return {statusCode:500,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:e.message})};}
};
