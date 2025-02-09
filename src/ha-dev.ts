const viteClientScript = document.createElement('script');
viteClientScript.type = 'module';
viteClientScript.src = 'http://localhost:5173/@vite/client';
document.head.appendChild(viteClientScript);

const haCustomCardsScript = document.createElement('script');
haCustomCardsScript.type = 'module';
haCustomCardsScript.src = 'http://localhost:5173/src/build.ts';
document.head.appendChild(haCustomCardsScript);

const reactRefreshScript = document.createElement('script');
reactRefreshScript.type = 'module';
reactRefreshScript.innerHTML = `
  import RefreshRuntime from 'http://localhost:5173/@react-refresh'
  RefreshRuntime.injectIntoGlobalHook(window)
  window.$RefreshReg$ = () => {}
  window.$RefreshSig$ = () => (type) => type
  window.__vite_plugin_react_preamble_installed__ = true
`;

document.head.appendChild(reactRefreshScript);
