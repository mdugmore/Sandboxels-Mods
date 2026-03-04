//v1.0.0
let mods = {};
const utf8Decoder = new TextDecoder('utf-8');
async function processMod(url, arr){
	if(arr[arr.length-1] == "orchidsmodmanager.js"){
		return;
	}
	let res = await fetch(url);
	let reader = res.body.getReader();
	let rr = await reader.read();
	let textRes = utf8Decoder.decode(rr.value);
	let tArr = textRes.split("\n");
	for(let line of tArr){
		//console.log(line);
		if(line.startsWith("//") && line.includes(":")){
			newLine = line.replace("//", "");
			let infoArr = newLine.split(":");
			mods[arr[arr.length-1]][infoArr[0]] = infoArr[1];
		} else if(line.replace(/\s/g, "").startsWith("elements.")){
			console.log(line);
			newLine = line.slice(line.indexOf("elements.")+"elements.".length, line.length);
			console.log(newLine);
			let infoArr = newLine.split(" ");
			console.log(infoArr);
			if(infoArr[1] == "=" || infoArr[0].endsWith("=")){
				if(!infoArr[0].includes(".")){
					mods[arr[arr.length-1]].elemsAdded.push(infoArr[0]);
					console.log(infoArr);
					elements[infoArr[0]].desc = (elements[infoArr[0]]?.desc != undefined) ? elements[infoArr[0]].desc + `This element was added by ${mods[arr[arr.length-1]].name}` : `This element was added by ${mods[arr[arr.length-1]].name}`;
				}
			}
		}
		
	}
}
runAfterLoad(()=>{
	for(let mod of enabledMods){
		let arr = mod.split("/");
		mods[arr[arr.length-1]] = {src: mod, name: arr[arr.length-1], elemsAdded: []};
		processMod(mod, arr);
	}
});
