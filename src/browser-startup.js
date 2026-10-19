try {
 await import('./arena-game.js?v=20261018-arena-1');
} catch(error) {
 const root=document.querySelector('#game-app');root.replaceChildren();
 const main=document.createElement('main');main.className='game-loading';
 const title=document.createElement('h1');title.textContent='The Coliseum could not open';
 const message=document.createElement('p');message.textContent=error.message;
 const button=document.createElement('button');button.textContent='Try again';button.addEventListener('click',()=>location.reload());
 main.append(title,message,button);root.append(main);
}
