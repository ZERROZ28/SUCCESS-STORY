// ============================================================================
// PAGES.JS — comportements partagés des pages secondaires
// (témoignage, éligibilité, connexion, compte, nouvelle commande)
// Ne touche ni à la scène 3D ni à main.js : fichier indépendant.
// ============================================================================

/**
 * Active une zone de dépôt de fichier (drag & drop + clic) et affiche
 * le nom du fichier choisi à la place de l'icône.
 */
function initUploadZone(zoneSelector) {
    const zone = document.querySelector(zoneSelector);
    if (!zone) return;

    const input = zone.querySelector('input[type="file"]');
    const icon = zone.querySelector('.upload-icon');
    const filenameEl = zone.querySelector('.upload-filename');

    const showFile = (file) => {
        if (!file) return;
        if (icon) icon.style.display = 'none';
        if (filenameEl) {
            filenameEl.textContent = file.name;
            filenameEl.style.display = 'block';
        }
    };

    zone.addEventListener('click', () => input && input.click());

    if (input) {
        input.addEventListener('change', () => {
            if (input.files && input.files[0]) showFile(input.files[0]);
        });
    }

    ['dragenter', 'dragover'].forEach((evt) => {
        zone.addEventListener(evt, (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach((evt) => {
        zone.addEventListener(evt, (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
        });
    });

    zone.addEventListener('drop', (e) => {
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file && input) {
            input.files = e.dataTransfer.files;
            showFile(file);
        }
    });
}

/**
 * Active/désactive un bouton selon le remplissage des champs requis
 * contenus dans le formulaire donné.
 */
function initFormGate(formSelector, btnSelector) {
    const form = document.querySelector(formSelector);
    const btn = document.querySelector(btnSelector);
    if (!form || !btn) return;

    const requiredFields = Array.from(form.querySelectorAll('[data-required]'));

    const check = () => {
        const allFilled = requiredFields.every((f) => f.value.trim().length > 0);
        btn.classList.toggle('is-disabled', !allFilled);
    };

    requiredFields.forEach((f) => f.addEventListener('input', check));
    check();
}

/**
 * Injecte le sticky header partagé (mêmes classes que main.js) pour les
 * pages secondaires qui n'ont pas de scène 3D / pin.
 */
function injectStickyHeader() {
    if (document.querySelector('.sticky-header')) return;

    const stickyHeader = document.createElement('div');
    stickyHeader.className = 'sticky-header visible';
    stickyHeader.innerHTML = `
        <div class="logo-sticky">
            <a href="index.html"><img src="src/LogoSite.svg" alt="Success Story by SNEP"></a>
        </div>
        <a href="compte.html" class="contact-btn-sticky">Mon compte</a>
    `;
    document.body.appendChild(stickyHeader);
}

/**
 * Active un popup d'information déclenché par un bouton "i" :
 * - clic sur le bouton "i" : ouvre le popup
 * - clic sur la croix : ferme le popup
 * Aucun autre déclencheur (pas de hover, pas de clic extérieur, pas
 * d'Échap) : seuls ces deux clics contrôlent l'ouverture/fermeture.
 */
function initInfoPopup(triggerSelector, popupSelector, closeSelector) {
    const trigger = document.querySelector(triggerSelector);
    const popup = document.querySelector(popupSelector);
    const closeBtn = document.querySelector(closeSelector);
    if (!trigger || !popup) return;

    const open = () => {
        popup.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
    };

    const close = () => {
        popup.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
    };

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        open();
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            close();
        });
    }
}

/**
 * Force la hauteur réelle de .page-shell.screen-fit à window.innerHeight
 * (mesurée en JS, pas en CSS vh/dvh). Certains environnements de preview
 * calculent vh/dvh différemment de la hauteur de fenêtre réellement
 * visible, ce qui peut laisser un vide sous le footer même quand le CSS
 * (min-height:100vh + flex) est correct. Cette fonction garantit que
 * .page-shell fait AU MOINS la hauteur de fenêtre réelle, en se mettant
 * à jour au resize.
 */
function initScreenFitHeight(selector) {
    const shell = document.querySelector(selector);
    if (!shell) return;

    const apply = () => {
        shell.style.minHeight = window.innerHeight + 'px';
    };

    apply();
    window.addEventListener('resize', apply);
}

document.addEventListener('DOMContentLoaded', () => {
    initScreenFitHeight('.page-shell.screen-fit');

    // Les pages qui ont déjà leur propre .page-header (logo + éventuel lien
    // "Mon compte") n'ont pas besoin du sticky-header dupliqué : l'injecter
    // quand même superposerait un second logo flou (backdrop-filter) par-
    // dessus le header natif, comme observé sur la page témoignage.
    if (document.querySelector('.page-header')) return;
    injectStickyHeader();
});
