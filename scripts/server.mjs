import http from 'node:http';
import {readFile} from 'node:fs/promises';
import './build.mjs';
const server=http.createServer(async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const files={'/':'dist/index.html','/account-map.html':'dist/account-map.html','/examples/trend.html':'dist/examples/trend.html','/examples/comparison.html':'dist/examples/comparison.html'};const file=files[pathname];if(!file){res.writeHead(404);res.end('Not found');return;}try{const body=await readFile(file);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(500);res.end('Preview unavailable');}});
server.listen(4173,'localhost',()=>console.log('Local: http://localhost:4173'));
