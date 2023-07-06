function createElementFromHTML(htmlString) {
    var p = document.createElement('p');
    p.innerHTML = htmlstring;
    return p.firstChild;
}
document.addEventListener("keydown", onKeydown);

function testRequest(){

    fetch('https://api.igdb.com/v4/age_ratings', {
  method: 'POST',
  headers: {
    'Client-ID': '38uhqll1la3ww9qfii6labx5hk56ys',
    'Authorization': 'Bearer baogiwysnyqs03h6nz21fq0vd9wkgo',
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: 'fields category,checksum,content_descriptions,rating,rating_cover_url,synopsis;'
}).then((response) => response.json())
.then((json) => console.log(json));

}

document.addEventListener('DOMContentLoaded',async function(){
    gameSpawnChance = 0;
    rnd = Math.floor(Math.random() * (gameSpawnChance))
    playGame = false//rnd%2 ==0;
    if(playGame){
        await WriteMessage('Do you want to play a game?(y/n):');
        AddNewLine()
        // input = document.getElementsByClassName("input")
    }

    
    console.log("Please ignore the mess. I'm workin' here!");
    testRequest();
},false);

function AddNewLine(){
    container = document.getElementsByClassName("center")[0]
    htmlstring = '<p><text class="user">anon@home:</text><text class="path"> ~/</text>$ <text id="dynText"class="input"></text><span class="blink">▮</span></p>'
    container.append(createElementFromHTML(htmlstring))
}

canWrite = true
async function WriteMessage(message){
    if(canWrite) {
        canWrite = false
        dynElement = document.getElementById("dynText");
        for(let i=0;i<message.length;i++){
            dynElement.append(message[i])
            await new Promise(r => setTimeout(r, 100));
        }
        dynElement.parentElement.removeChild(dynElement.nextElementSibling)
        dynElement.removeAttribute('id');
        await new Promise(r => setTimeout(r, 500));
        canWrite = true
    }   
}
async function onKeydown(e){
    var KeyID = e.keyCode;
    switch(KeyID)
    {
        case 8:
        case 46:
            inputText = inputText.slice(0,-1)
        break;
        case 9:
        case 12:
        case 16:
        case 17:
        case 18:
        case 20:
        case 27:
        case 33:
        case 34:
        case 35:
        case 36:
        case 37:
        case 38:
        case 39:
        case 40:
        case 45:
        case 144:
            break;
        case 13:
            // Enter key
            // await WriteMessage('The game is not ready yet. Visit me another time to play')
            // AddNewLine()
            break;
        default:
            inputText+=e.key
        break;
    }
    input = document.getElementsByClassName('input')[0];
    if(input){
        if(input.firstChild){
            input.firstChild.replaceWith(inputText)
        }
        else{
            input.append(inputText)
        }
    }
    else{
        inputText=""
    }
}
inputText = "";
