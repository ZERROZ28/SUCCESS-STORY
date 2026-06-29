// ============================================================================
// 1. ENREGISTREMENT DES PLUGINS GSAP
// ============================================================================
gsap.registerPlugin(ScrollTrigger);

// ============================================================================
// 2. CONFIGURATION DE LA SCÈNE THREE.JS
// ============================================================================
const canvas = document.querySelector('#webgl');
const scene = new THREE.Scene();

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

const aspect = sizes.width / sizes.height;
const frustumSize = 20; 
const camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    100
);
camera.position.set(12, 10, 12); 
camera.lookAt(0, 0, 0);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true 
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.physicallyCorrectLights = true; 
renderer.outputEncoding = THREE.sRGBEncoding; 

// ============================================================================
// 3. CONFIGURATION DES ÉCLAIRAGES ET DE L'ENVIRONNEMENT (AMBIANCE LUXE CHAUDE)
// ============================================================================
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

const generateBlankEnvMap = () => {
    const data = new Uint8Array([
        120, 90, 60, 255,     255, 210, 160, 255,
        20, 10, 5, 255,       80, 50, 30, 255
    ]);
    const texture = new THREE.DataTexture(data, 2, 2, THREE.RGBAFormat);
    texture.needsUpdate = true;
    const renderTarget = pmremGenerator.fromEquirectangular(texture);
    scene.environment = renderTarget.texture;
};
generateBlankEnvMap();

const ambientLight = new THREE.HemisphereLight(0xd47e33, 0x0a0500, 1.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffdfb0, 10);
dirLight.position.set(8, 12, 8);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.bias = -0.001; 
scene.add(dirLight);

const rimLight = new THREE.DirectionalLight(0xff9944, 6);
rimLight.position.set(-10, 6, -10);
scene.add(rimLight);

const dynamicLight = new THREE.PointLight(0xff4400, 12, 30);
dynamicLight.position.set(0, 2, -6);
scene.add(dynamicLight);

const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: 0.5, color: 0x050100 })
);
shadowPlane.position.set(0, -5.5, 0);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

// ============================================================================
// 4. CHARGEMENT DU MODÈLE GLB & AJUSTEMENT PHYSIQUE DES MATÉRIAUX
// ============================================================================
const loader = new THREE.GLTFLoader();
let mixer = null;
let animationActions = [];
let modelScene = null;
let isLoaded = false; 

loader.load(
    'src/model3.glb', 
    (gltf) => {
        modelScene = gltf.scene;
        
        modelScene.scale.set(0.01, 0.01, 0.01);
        modelScene.position.set(0, -0.77, 0);
        
        modelScene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                const name = child.name.toLowerCase();
                
                if (name.includes('vitre') || name.includes('glass') || name.includes('window')) {
                    child.material = new THREE.MeshPhysicalMaterial({
                        color: 0x111111,          
                        roughness: 0.05,         
                        metalness: 0.1,
                        transparent: true,       
                        opacity: 0.45,           
                        transmission: 0.6,       
                        ior: 1.52,               
                        thickness: 0.5,          
                        depthWrite: false        
                    });
                } 
                else if (name.includes('cadre') || name.includes('frame') || name.includes('gold') || name.includes('disque')) {
                    if (child.material) {
                        child.material.roughness = 0.15; 
                        child.material.metalness = 1.0;  
                    }
                }
            }
        });

        scene.add(modelScene);

        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(modelScene);

            // Ordre de découpage : du fond vers l'avant, progressivement.
            // Chaque clip démarre à un offset différent dans le scroll (0→1)
            // et joue jusqu'à progress = 1, créant un effet de cascade.
            const staggerOrder = {
                'Action.003': 0.00,   // Fond          → 1er à s'animer
                'Action':     0.10,   // Cadre
                'Action.002': 0.20,   // CentreDisque
                'Action.001': 0.30,   // CentreDisque.001
                'Action.006': 0.40,   // Vitre
                'Action.004': 0.50,   // Plaquette
                'Action.005': 0.60,   // Visuel.001    → dernier
            };

            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.reset();
                action.enabled = true;
                action.setEffectiveWeight(1);
                action.play();
                action.paused = true;

                animationActions.push({ action, duration: clip.duration });
            });
        }

        initScrollAnimations();
        isLoaded = true;
    },
    undefined,
    (error) => console.error("Erreur lors du chargement du fichier GLB :", error)
);

// ============================================================================
// 5. TIMELINE ET LOGIQUE DE PROGRESSION ET DE HIÉRARCHISATION (SCROLL ANCHOR)
// ============================================================================
function initScrollAnimations() {
    
    // Étape A : Placement initial du logo au centre exact de l'écran (Intro)
    gsap.set("#main-logo", {
        top: "50%",
        left: "50%",
        xPercent: -50,
        yPercent: -50,
        scale: 1.5,
        opacity: 0 
    });

    // 1. ÉTAPE D'OUVERTURE AU FONDU (Dès l'arrivée sur la page)
    const introTl = gsap.timeline();
    introTl.to("#webgl", { opacity: 1, duration: 2.0, ease: "power2.out" })
           .to("#main-logo", { opacity: 1, duration: 1.0, ease: "power2.out" }, "-=0.8")

    // 2. ÉTAPE DE BLOCAGE ET D'ANIMATION DE LA 3D (Épinglage de l'écran)
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".gltf-pin-container",
            start: "top top",
            end: "+=200%",        // Bloque l'écran sur 200% de la hauteur de fenêtre pour faire vivre l'animation
            scrub: 1.2,
            pin: true,            // Épingle la scène 3D pour la rendre fixe
            pinSpacing: true      // Repousse automatiquement le texte en dessous pendant le blocage
        }
    });

    let scrollProgress = { value: 0 };

    tl.to(scrollProgress, {
        value: 1,
        ease: "none",
        onUpdate: () => {
            const progress = scrollProgress.value;

            // Suivi des animations du disque
            // Démarre à 30% du scroll, se termine à 100% → découpage plus progressif
            const animStart = 0.05;
            const animProgress = Math.max(0, Math.min((progress - animStart) / (1 - animStart), 1));
            animationActions.forEach(({ action, duration }) => {
                action.time = duration * animProgress;
            });

            // Mouvement de la caméra
            const startAngle = Math.PI * 0.25; 
            const endAngle = Math.PI * 0.85;   
            const angle = startAngle + progress * (endAngle - startAngle);
            const radius = 20;
            
            camera.position.set(
                Math.cos(angle) * radius,
                10 - (progress * 4), 
                Math.sin(angle) * radius
            );
            
            camera.zoom = 70 - progress * 15;
            camera.lookAt(0, -0.5, 0);
            camera.updateProjectionMatrix();

            // Gestion dynamique des lumières
            dynamicLight.position.x = Math.sin(progress * Math.PI * 2) * 10;
            dynamicLight.position.y = 2 + (progress * 6);
            dynamicLight.intensity = 15 + (progress * 50); 
            
            dirLight.position.x = 8 + Math.sin(progress * Math.PI) * 6;
            dirLight.position.z = 8 + Math.cos(progress * Math.PI) * 4;
        }
    }, 0);

    // Déplacement du logo vers le coin inférieur gauche pendant l'action
    tl.to("#main-logo", {
        left: "2rem",
        top: "calc(100vh - 8rem)",
        xPercent: 0,
        yPercent: 0,
        scale: 1,
        ease: "power2.inOut"
    }, 0);

    // Apparition du bouton contact vers la fin de la timeline de blocage
    tl.to("#contact-btn", {
        opacity: 1,
        y: -20,
        ease: "power2.out"
    }, 0.35); 

    // 3. ÉTAPE DE FERMETURE AU FONDU NOIR FINAL (Juste avant que le texte ne prenne le relais)
    tl.to(".fade-to-black", {
        opacity: 1,
        ease: "power1.in"
    }, 0.25); // S'exécute sur les 15 derniers pourcents du blocage 3D

    // 4. STICKY HEADER : injecté dans le DOM, visible dès que le scroll classique commence
    const stickyHeader = document.createElement('div');
    stickyHeader.className = 'sticky-header';
    stickyHeader.innerHTML = `
        <div class="logo-sticky">
            <img src="src/LogoSite.svg" alt="Success Story by SNEP">
        </div>
        <a href="#contact" class="contact-btn-sticky">Prendre contact !</a>
    `;
    document.body.appendChild(stickyHeader);

    ScrollTrigger.create({
        trigger: ".scroll-container",
        start: "top 10%",   // dès que le scroll-container entre dans la vue
        onEnter: () => stickyHeader.classList.add('visible'),
        onLeaveBack: () => stickyHeader.classList.remove('visible'),
    });
}

// ============================================================================
// 6. BOUCLE DE RENDU CONTINU & RESPONSIVE WINDOW
// ============================================================================
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = sizes.width / aspect; // Maintient le ratio orthographique propre sur le resize
    
    // Si besoin d'un comportement plein écran strict
    sizes.height = window.innerHeight;

    const currentAspect = sizes.width / sizes.height;
    camera.left = (frustumSize * currentAspect) / -2;
    camera.right = (frustumSize * currentAspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const tick = () => {
    if (isLoaded && mixer) {
        mixer.update(0); 
    }

    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
};

tick();