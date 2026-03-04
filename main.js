import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// Configuração base (1 unidade = 1mm para impressão 3D)
const NFC_SLOT_WIDTH = 25;
const NFC_SLOT_HEIGHT = 25;
const NFC_SLOT_DEPTH = 1.5;
const BORDER_HEIGHT = 2;
const KEYRING_HOLE_RADIUS = 3;
const LOGO_AREA_RADIUS = 18;
const TAB_WIDTH = 10;
const TAB_HEIGHT = 10;

class KeychainCreator {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 1, 1000);
    this.renderer = null;
    this.controls = null;
    this.keychainGroup = new THREE.Group();
    this.logoMesh = null;
    this.logoBottomMesh = null;

    this.params = {
      diameter: 50,
      thickness: 5,
      rounding: 100,
      colorBase: 0x2d5a27,
      colorLogo: 0xffffff,
      colorBorder: 0x1a3d17,
      logoDepth: 0.8,
      logoSvg: null,
      logoBottomSvg: null,
    };

    this.init();
  }

  init() {
    this.setupRenderer();
    this.setupLights();
    this.setupControls();
    this.bindUI();
    this.buildKeychain();
    this.animate();
    window.addEventListener('load', () => {
      this.onResize();
      this.forceRender();
    });
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const w = Math.max(this.container.clientWidth, 400);
    const h = Math.max(this.container.clientHeight, 300);
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.updateRendererTheme();
    window.addEventListener('themechange', () => this.updateRendererTheme());
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 0, 120);
    this.camera.lookAt(0, 0, 0);

    window.addEventListener('resize', () => this.onResize());
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this.onResize()).observe(this.container);
    }
    requestAnimationFrame(() => this.onResize());
  }

  setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 80, 60);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x88ccff, 0.3);
    fillLight.position.set(-40, 20, 40);
    this.scene.add(fillLight);
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 40;
    this.controls.maxDistance = 200;
  }

  buildKeychain() {
    this.scene.remove(this.keychainGroup);
    this.keychainGroup = new THREE.Group();

    const radius = this.params.diameter / 2;
    const baseGeometry = this.createBaseGeometry(radius);
    const slotGeometry = this.createNFCSlotRecess(radius);
    const borderGeometry = this.createBorderGeometry(radius);

    const tabGeometry = this.createKeyringTab(radius);
    const mergedBody = BufferGeometryUtils.mergeGeometries([
      baseGeometry,
      slotGeometry,
      borderGeometry,
      ...(tabGeometry ? [tabGeometry] : []),
    ]);
    if (mergedBody) {
      mergedBody.computeVertexNormals();
      const bodyMaterial = new THREE.MeshPhongMaterial({
        color: this.params.colorBase,
        shininess: 35,
        specular: 0x333333,
      });
      const bodyMesh = new THREE.Mesh(mergedBody, bodyMaterial);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      this.keychainGroup.add(bodyMesh);
    }

    if (this.params.logoSvg) {
      this.addLogoMesh(true);
    }
    if (this.params.logoBottomSvg) {
      this.addLogoMesh(false);
    }

    this.scene.add(this.keychainGroup);
  }

  createKeychainShape(radius, clockwise = false) {
    const pct = this.params.rounding / 100;
    const segments = 64;

    if (pct >= 0.99) {
      const shape = new THREE.Shape();
      shape.absarc(0, 0, radius, 0, Math.PI * 2, clockwise);
      return shape;
    }

    const R = radius;
    const n = pct <= 0.01 ? 100 : 2 + 48 * (1 - pct);
    const shape = new THREE.Shape();

    for (let i = 0; i < segments; i++) {
      const t = (clockwise ? 1 : -1) * (2 * Math.PI * i) / segments;
      const ct = Math.cos(t);
      const st = Math.sin(t);
      const x = R * (ct >= 0 ? 1 : -1) * Math.pow(Math.abs(ct), 2 / n);
      const y = R * (st >= 0 ? 1 : -1) * Math.pow(Math.abs(st), 2 / n);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }

  createBaseGeometry(radius) {
    const innerRadius = radius - BORDER_HEIGHT;
    const baseDepth = Math.max(1, this.params.thickness - NFC_SLOT_DEPTH - BORDER_HEIGHT);

    const shape = this.createKeychainShape(innerRadius);

    const extrudeSettings = {
      depth: baseDepth,
      bevelEnabled: false,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.computeVertexNormals();
    return geometry;
  }

  createBorderGeometry(radius) {
    const outerRadius = radius;
    const innerRadius = radius - BORDER_HEIGHT;
    const baseDepth = Math.max(1, this.params.thickness - NFC_SLOT_DEPTH - BORDER_HEIGHT);

    const outerShape = this.createKeychainShape(outerRadius);
    const innerHole = this.createKeychainShape(innerRadius, true);
    const innerPoints = innerHole.getPoints(64);
    const holePath = new THREE.Path(innerPoints);
    holePath.closePath();
    outerShape.holes.push(holePath);

    const extrudeSettings = {
      depth: BORDER_HEIGHT,
      bevelEnabled: false,
    };
    const geometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
    geometry.translate(0, 0, baseDepth + NFC_SLOT_DEPTH);
    geometry.computeVertexNormals();
    return geometry;
  }

  createNFCSlotRecess(radius) {
    const innerRadius = radius - BORDER_HEIGHT;
    const baseDepth = Math.max(1, this.params.thickness - NFC_SLOT_DEPTH - BORDER_HEIGHT);
    const maxSlotDim = Math.min(NFC_SLOT_WIDTH, innerRadius * 1.6);
    const nfcW = Math.min((NFC_SLOT_WIDTH - 2) / 2, maxSlotDim / 2 - 1);
    const nfcH = Math.min((NFC_SLOT_HEIGHT - 2) / 2, maxSlotDim / 2 - 1);

    const shape = this.createKeychainShape(innerRadius);
    const nfcHole = new THREE.Path();
    nfcHole.moveTo(-nfcW, -nfcH);
    nfcHole.lineTo(nfcW, -nfcH);
    nfcHole.lineTo(nfcW, nfcH);
    nfcHole.lineTo(-nfcW, nfcH);
    nfcHole.closePath();
    shape.holes.push(nfcHole);

    const extrudeSettings = {
      depth: NFC_SLOT_DEPTH,
      bevelEnabled: false,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(0, 0, baseDepth);
    geometry.computeVertexNormals();
    return geometry;
  }

  createKeyringTab(radius) {
    const innerRadius = radius - BORDER_HEIGHT;
    const tabW = Math.min(TAB_WIDTH, innerRadius * 0.5);
    const w = tabW / 2;
    const h = TAB_HEIGHT;
    const r = Math.min(2, w * 0.4, (h - 6) * 0.2);

    const shape = new THREE.Shape();
    shape.moveTo(-w + r, 0);
    shape.lineTo(w - r, 0);
    shape.absarc(w - r, r, r, -Math.PI / 2, 0, false);
    shape.lineTo(w, h - r);
    shape.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
    shape.lineTo(-w + r, h);
    shape.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(-w, r);
    shape.absarc(-w + r, r, r, Math.PI, Math.PI * 3 / 2, false);

    const hole = new THREE.Path();
    hole.absarc(0, h - 4, KEYRING_HOLE_RADIUS, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const extrudeSettings = {
      depth: this.params.thickness,
      bevelEnabled: false,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(0, innerRadius - 0.5, 0);
    geometry.computeVertexNormals();
    return geometry;
  }

  addLogoMesh(isTop) {
    const svgString = isTop ? this.params.logoSvg : this.params.logoBottomSvg;
    if (!svgString) return;

    try {
      const normalizedSvg = this.normalizeSvgForLoader(svgString);
      const loader = new SVGLoader();
      const svgData = loader.parse(normalizedSvg);
      const paths = svgData.paths;

      if (paths.length === 0) {
        console.warn('SVG sem elementos path encontrados');
        return;
      }

      const group = new THREE.Group();
      for (const path of paths) {
        const shapes = SVGLoader.createShapes(path);
        for (const shape of shapes) {
          const extrudeSettings = {
            depth: this.params.logoDepth,
            bevelEnabled: false,
          };
          const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
          const material = new THREE.MeshPhongMaterial({
            color: this.params.colorLogo,
            side: THREE.DoubleSide,
          });
          const mesh = new THREE.Mesh(geometry, material);
          group.add(mesh);
        }
      }

      if (group.children.length === 0) {
        const strokeGeometries = this.createStrokeGeometries(paths);
        for (const geom of strokeGeometries) {
          const material = new THREE.MeshPhongMaterial({
            color: this.params.colorLogo,
            side: THREE.DoubleSide,
          });
          group.add(new THREE.Mesh(geom, material));
        }
      }

      if (group.children.length === 0) {
        console.warn('SVG sem formas extraíveis. Use paths com fill.');
        return;
      }

      const box = new THREE.Box3().setFromObject(group);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, 0.001);
      const scale = (LOGO_AREA_RADIUS * 2) / maxDim;

      group.children.forEach((child) => {
        if (child.isMesh && child.geometry) {
          child.geometry.translate(-center.x, -center.y, -center.z);
        }
      });
      group.scale.set(scale, -scale, 1);
      group.position.set(0, 0, 0);

      const topSurfaceZ = this.params.thickness + this.params.logoDepth / 2 + 0.1;
      if (isTop) {
        if (this.logoMesh) this.keychainGroup.remove(this.logoMesh);
        group.position.z = topSurfaceZ;
        this.logoMesh = group;
        this.keychainGroup.add(group);
      } else {
        if (this.logoBottomMesh) this.keychainGroup.remove(this.logoBottomMesh);
        group.position.z = -this.params.logoDepth / 2 - 0.1;
        group.rotation.x = Math.PI;
        this.logoBottomMesh = group;
        this.keychainGroup.add(group);
      }
    } catch (err) {
      console.error('Erro ao processar SVG:', err);
      alert('Erro ao processar o logo SVG. Use um arquivo com elementos <path> e fill.');
    }
  }

  normalizeSvgForLoader(svgString) {
    return svgString
      .replace(/fill="none"/gi, 'fill="currentColor"')
      .replace(/fill='none'/gi, "fill='currentColor'");
  }

  createStrokeGeometries(paths) {
    const geometries = [];
    try {
      const style = SVGLoader.getStrokeStyle(2, '#000', 'round', 'round', 4);
      for (const path of paths) {
        const curvePath = path.path || path;
        if (!curvePath || !curvePath.getPoints) continue;
        const pts = curvePath.getPoints();
        if (pts.length < 2) continue;
        const points = pts.map((p) => new THREE.Vector2(p.x, p.y));
        const strokeGeometry = SVGLoader.pointsToStroke(points, style);
        if (strokeGeometry) geometries.push(strokeGeometry);
      }
    } catch (_) {}
    return geometries;
  }

  async loadSvgFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  syncParamsFromDOM() {
    this.params.diameter = parseInt(document.getElementById('size-slider').value);
    this.params.thickness = Math.max(5, Math.min(10, parseFloat(document.getElementById('thickness-input').value) || 5));
    this.params.rounding = parseInt(document.getElementById('rounding-slider').value);
    this.params.colorBase = this.hexToThree(document.getElementById('color-base').value);
    this.params.colorLogo = this.hexToThree(document.getElementById('color-logo').value);
    this.params.colorBorder = this.hexToThree(document.getElementById('color-border').value);
    this.params.logoDepth = parseFloat(document.getElementById('logo-depth').value);
  }

  async setLogo(file, isTop) {
    try {
      const svgString = await this.loadSvgFromFile(file);
      if (!svgString || !svgString.trim().startsWith('<')) {
        throw new Error('Arquivo inválido. Use um arquivo SVG.');
      }
      this.syncParamsFromDOM();
      if (isTop) {
        this.params.logoSvg = svgString;
      } else {
        this.params.logoBottomSvg = svgString;
      }
      this.buildKeychain();
      requestAnimationFrame(() => {
        this.forceRender();
        requestAnimationFrame(() => this.forceRender());
      });
    } catch (err) {
      console.error('Erro ao carregar SVG:', err);
      alert('Erro ao carregar o arquivo SVG. Verifique se é um SVG válido.');
    }
  }

  clearLogo(isTop) {
    if (isTop) {
      this.params.logoSvg = null;
      if (this.logoMesh) {
        this.keychainGroup.remove(this.logoMesh);
        this.logoMesh = null;
      }
    } else {
      this.params.logoBottomSvg = null;
      if (this.logoBottomMesh) {
        this.keychainGroup.remove(this.logoBottomMesh);
        this.logoBottomMesh = null;
      }
    }
    document.getElementById(isTop ? 'logo-upload' : 'logo-bottom-upload').value = '';
    requestAnimationFrame(() => this.renderer.render(this.scene, this.camera));
  }

  hexToThree(hex) {
    return parseInt(hex.replace('#', ''), 16);
  }

  updateFromParams() {
    this.syncParamsFromDOM();
    this.buildKeychain();
    requestAnimationFrame(() => this.renderer.render(this.scene, this.camera));
  }

  bindUI() {
    document.getElementById('logo-upload').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.setLogo(file, true);
    });

    document.getElementById('logo-bottom-upload').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.setLogo(file, false);
    });

    document.getElementById('clear-logo').addEventListener('click', () => this.clearLogo(true));
    document.getElementById('clear-logo-bottom').addEventListener('click', () => this.clearLogo(false));

    document.getElementById('color-base').addEventListener('input', () => this.updateFromParams());
    document.getElementById('color-logo').addEventListener('input', () => this.updateFromParams());
    document.getElementById('color-border').addEventListener('input', () => this.updateFromParams());

    document.getElementById('size-slider').addEventListener('input', (e) => {
      document.getElementById('size-value').textContent = e.target.value;
      this.updateFromParams();
    });

    document.getElementById('thickness-input').addEventListener('input', () => this.updateFromParams());
    document.getElementById('thickness-input').addEventListener('change', () => this.updateFromParams());

    document.getElementById('rounding-slider').addEventListener('input', (e) => {
      document.getElementById('rounding-value').textContent = e.target.value;
      this.updateFromParams();
    });

    document.getElementById('logo-depth').addEventListener('input', (e) => {
      document.getElementById('logo-depth-value').textContent = e.target.value;
      this.updateFromParams();
    });

    document.getElementById('export-stl').addEventListener('click', () => this.exportSTL());
  }

  exportSTL() {
    const exporter = new STLExporter();
    const clone = this.keychainGroup.clone();
    clone.traverse((child) => {
      if (child.isMesh && child.geometry) {
        child.geometry = child.geometry.clone();
      }
    });
    const stlString = exporter.parse(clone, { binary: false });
    const blob = new Blob([stlString], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chaveiro-nfc.stl';
    link.click();
    URL.revokeObjectURL(url);
  }

  updateRendererTheme() {
    if (!this.renderer) return;
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    this.renderer.setClearColor(theme === 'light' ? 0xe2e8f0 : 0x0c1220, 1);
  }

  onResize() {
    const w = Math.max(this.container.clientWidth, 400);
    const h = Math.max(this.container.clientHeight, 300);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.forceRender();
  }

  forceRender() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new KeychainCreator();
