# Criador de Chaveiro 3D

Ferramenta web para criar modelos 3D de chaveiros personalizáveis com slot para etiqueta NFC e borda compatível com resina.

![Criador de Chaveiro 3D](https://img.shields.io/badge/Three.js-3D-orange) ![License](https://img.shields.io/badge/license-MIT-blue)

## Como usar

1. Clone o repositório ou baixe os arquivos
2. Abra `index.html` em um navegador ou use um servidor local:
   ```bash
   npx serve
   ```
3. Acesse http://localhost:3000
4. Faça upload de um logo em SVG (campo "Logo Principal")
5. Opcionalmente adicione um logo na parte inferior
6. Ajuste cores, tamanho e forma conforme preferir
7. Clique em "Exportar STL para Impressora 3D"

## Características

- **Slot NFC**: Rebaixo de 25x25mm para acomodar adesivo NFC (pause a impressão para inserir)
- **Borda elevada**: Compatível com cobertura de resina
- **Ring role na parte superior**: Aba com furo para anel, posicionada no topo
- **Forma ajustável**: De quadrado (0%) a redondo (100%)
- **Logo SVG**: Suporta qualquer SVG com elementos `<path>`
- **Tema claro/escuro**: Alternância entre temas
- **Exportação STL**: Pronto para Cura, PrusaSlicer e outros slicers

## Tecnologias

- HTML5, CSS3, JavaScript
- [Three.js](https://threejs.org/) para renderização 3D
- Sem dependências de build

## Licença

MIT
