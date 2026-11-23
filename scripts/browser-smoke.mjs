
import {spawn} from 'node:child_process'
import {setTimeout as delay} from 'node:timers/promises'
import {chromium} from 'playwright'

const site = 'http://127.0.0.1:4173'
const server = spawn('npm',['run','dev','--','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:'pipe'})
let logs = ''
for(const channel of [server.stdout, server.stderr]) channel.on('data',b=>{logs+=b.toString()})
let browser
async function waitForServer() {
  for(let n=0;n<100;n++){
    try {const r=await fetch(site); if(r.ok)return} catch{}
    if(server.exitCode!==null)throw new Error('Vite exited: '+logs)
    await delay(300)
  }
  throw new Error('Vite did not start: '+logs)
}
async function waitForPreview(page, tool) {
  const response = await page.goto(site+'/'+tool)
  console.log('Opening',tool,'response',response?.status(),'url',page.url())
  try {
    await page.getByRole('heading',{name:tool[0].toUpperCase()+tool.slice(1),exact:true}).waitFor({timeout:30000})
  } catch(error) {
    console.error('Body snapshot:',(await page.locator('body').innerText()).slice(0,1600))
    console.error('Page errors:',errors)
    throw error
  }
  await page.locator('canvas').first().waitFor({state:'attached',timeout:30000})
  await page.waitForFunction(()=>!document.querySelector('[aria-busy="true"][role="status"]'),null,{timeout:60000})
  const size=await page.locator('canvas').first().evaluate(c=>({w:c.width,h:c.height}))
  if(size.w<1 || size.w>1680 || size.h<1 || size.h>1680)throw new Error(tool+' invalid preview canvas: '+JSON.stringify(size))
  console.log(tool+' preview ready',size)
}
try {
  await waitForServer()
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']})
  const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true})
  const errors=[]
  page.on('pageerror',error=>{errors.push(error.message);console.error('Page exception:',error.message)})
  await waitForPreview(page,'topo')
  await page.locator('#preview-quality').selectOption('detail')
  await page.waitForFunction(()=>document.querySelector('canvas')?.width===1680,null,{timeout:30000})
  const downloadPromise=page.waitForEvent('download',{timeout:90000})
  await page.getByRole('button',{name:'Export PNG'}).click()
  const download=await downloadPromise
  if(!download.suggestedFilename().endsWith('.png'))throw new Error('Incorrect PNG filename')
  console.log('full-resolution PNG downloaded:',download.suggestedFilename())
  await waitForPreview(page,'blocks')
  await page.getByRole('button',{name:'Undo',exact:true}).first().waitFor()
  await page.setViewportSize({width:390,height:844})
  await page.goto(site+'/blocks')
  await page.getByRole('button',{name:'Switch tool'}).waitFor({timeout:15000})
  await page.locator('#preview-quality').waitFor({timeout:15000})
  // WebGL may be unavailable on some hosted runners; still verify Marble's UI is usable.
  await page.goto(site+'/marble')
  await page.getByRole('heading',{name:'Marble',exact:true}).waitFor({timeout:30000})
  await page.locator('canvas').first().waitFor({state:'attached',timeout:30000})
  if(errors.length)throw new Error('Browser exceptions: '+errors.join('; '))
  console.log('Browser smoke test passed')
} finally {
  if(browser) await browser.close()
  server.kill('SIGTERM')
}
