# Layout da Linha

Protótipo de redesign do portal **Layout da Linha**, usado para criar e balancear layouts de linhas de produção e teste.

Abra o `index.html` no navegador. Não precisa de build nem de servidor.

## O que tem

- **Menu lateral retrátil**: recolhe só para ícones (botão `«` ou tecla `[`) e vira gaveta no celular.
- **Tema claro, escuro ou automático** e cor de destaque configurável (padrão: Samsung Blue).
- **Fundo com a linha de testes**: foto, vídeo ou uma foto enviada da sua própria linha, com intensidade e desfoque ajustáveis.
- **Editor de layout**: arraste as estações da paleta para o canvas. Dá para mover, redimensionar, girar, duplicar, alinhar e desfazer.
- **Cálculos ao vivo**: sequência do fluxo, gargalo, UPH teórico, takt da meta, balanceamento e área ocupada.
- **Meus layouts**, **Biblioteca de estações** e busca rápida (`Ctrl+K`).
- Exportação em JSON e SVG, importação de JSON e backup completo.

Os dados ficam salvos no `localStorage` do navegador.

## Estrutura

```
index.html              página e ícones (sprite SVG)
assets/css/style.css    design system: tokens, shell, componentes, páginas, editor
assets/js/app.js        rotas, editor, configurações
assets/img, assets/video  imagens de fundo
```

Para aplicar o estilo a outro portal, copie as seções 1 a 5 do `style.css` (tokens, base, fundo, shell e componentes) e use as mesmas classes no HTML.

## Créditos

As fotos e o vídeo de fundo são do [Samsung Newsroom](https://news.samsung.com/).
