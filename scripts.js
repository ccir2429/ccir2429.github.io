function createElementFromHTML(htmlString) {
    var p = document.createElement('p');
    p.innerHTML = htmlstring;
    return p.firstChild;
}
document.addEventListener("keydown", onKeydown);

document.addEventListener('DOMContentLoaded',async function(){
    gameSpawnChance = 10;
    rnd = Math.floor(Math.random() * (gameSpawnChance))
    playGame = rnd%2 ===0;
    if(playGame){

    const message = 'Do you want to play a game?(y/n):'
    dynElement = document.getElementById("dynText");
    for(let i=0;i<message.length;i++){
        dynElement.append(message[i])
        await new Promise(r => setTimeout(r, 100));
    }
    dynElement.parentElement.removeChild(dynElement.nextElementSibling)
    await new Promise(r => setTimeout(r, 500));
    container = document.getElementsByClassName("center")[0]
    htmlstring = '<p><text class="user">anon@home:</text><text class="path"> ~/</text>$ <text class="input"></text><span class="blink">▮</span></p>'
    container.append(createElementFromHTML(htmlstring))
    input = document.getElementsByClassName("input")
    }
},false);

function onKeydown(e){
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