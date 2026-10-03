/* REDE OBSERVATÓRIO — script compartido: idiomas + agente IA */
const CONFIG = {
    /* URL del backend del agente IA. Déjala vacía para usar el mensaje de espera. */
    apiUrl: 'https://observatorio.francesc-j-hernandez.workers.dev'
};

/* marked.js se carga de forma dinámica; si falla el CDN, el chat
   muestra las respuestas como texto plano (sin formato). */
let mdReady = false;
(function loadMarkdown() {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js';
    s.onload = () => { mdReady = true; };
    s.onerror = () => { mdReady = false; };
    document.head.appendChild(s);
})();

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
              .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const I18N = {
    pt: {
        docTitle: "Rede Observatório de Igualdade Educativa Inclusiva",
        mainTitle: "Rede Observatório de Igualdade Educativa Inclusiva",
        navInfo: "Informação sobre o projeto",
        navEquipo: "Equipe de pesquisa e contato",
        navRepo: "Repositório de prompts-mestres",
        navLibros: "Livros especializados",
        navBiblio: "Biblioteca colaborativa de artigos",
        chatTitle: "Pergunte ao nosso agente IA",
        chatPlaceholder: "Escreva a sua pergunta...",
        sendTitle: "Enviar",
        micTitle: "Falar (microfone)",
        micUnsupported: "O reconhecimento de voz não é suportado neste navegador. Use Chrome ou Edge.",
        agentWaiting: "Ainda não estou conectado a um servidor de IA. Peça ao administrador que configure CONFIG.apiUrl no ficheiro app.js.",
        agentError: "Desculpe, ocorreu um erro. Tente novamente mais tarde."
    },
    es: {
        docTitle: "Red Observatorio de Igualdad Educativa Inclusiva",
        mainTitle: "Red Observatorio de Igualdad Educativa Inclusiva",
        navInfo: "Información sobre el proyecto",
        navEquipo: "Equipo de investigación y contacto",
        navRepo: "Repositorio de prompts-maestros",
        navLibros: "Libros especializados",
        navBiblio: "Biblioteca colaborativa de artículos",
        chatTitle: "Pregunte a nuestro agente IA",
        chatPlaceholder: "Escriba su pregunta...",
        sendTitle: "Enviar",
        micTitle: "Hablar (micrófono)",
        micUnsupported: "El reconocimiento de voz no es compatible con este navegador. Use Chrome o Edge.",
        agentWaiting: "Aún no estoy conectado a un servidor de IA. Pida al administrador que configure CONFIG.apiUrl en el archivo app.js.",
        agentError: "Lo siento, ocurrió un error. Inténtelo de nuevo más tarde."
    },
    en: {
        docTitle: "Inclusive Educational Equality Observatory Network",
        mainTitle: "Inclusive Educational Equality Observatory Network",
        navInfo: "Project information",
        navEquipo: "Research team and contact",
        navRepo: "Master prompts repository",
        navLibros: "Specialized books",
        navBiblio: "Collaborative article library",
        chatTitle: "Ask our AI agent",
        chatPlaceholder: "Type your question...",
        sendTitle: "Send",
        micTitle: "Speak (microphone)",
        micUnsupported: "Speech recognition is not supported in this browser. Use Chrome or Edge.",
        agentWaiting: "I am not connected to an AI server yet. Ask the administrator to set CONFIG.apiUrl in app.js.",
        agentError: "Sorry, an error occurred. Please try again later."
    },
    fr: {
        docTitle: "Réseau Observatoire d'Égalité Éducative Inclusive",
        mainTitle: "Réseau Observatoire d'Égalité Éducative Inclusive",
        navInfo: "Informations sur le projet",
        navEquipo: "Équipe de recherche et contact",
        navRepo: "Répertoire de prompts-maîtres",
        navLibros: "Livres spécialisés",
        navBiblio: "Bibliothèque collaborative d'articles",
        chatTitle: "Demandez à notre agent IA",
        chatPlaceholder: "Écrivez votre question...",
        sendTitle: "Envoyer",
        micTitle: "Parler (microphone)",
        micUnsupported: "La reconnaissance vocale n'est pas prise en charge par ce navigateur. Utilisez Chrome ou Edge.",
        agentWaiting: "Je ne suis pas encore connecté à un serveur d'IA. Demandez à l'administrateur de configurer CONFIG.apiUrl dans app.js.",
        agentError: "Désolé, une erreur est survenue. Réessayez plus tard."
    }
};

const SPEECH_LANGS = { pt: 'pt-BR', es: 'es-ES', en: 'en-US', fr: 'fr-FR' };
let currentLang = 'pt';

function t(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) || I18N.pt[key] || key;
}

function setLanguage(lang) {
    if (!I18N[lang]) return;
    currentLang = lang;
    document.documentElement.lang = lang;
    document.title = t('docTitle');

    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.innerText = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.getAttribute('data-i18n-title'));
    });

    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    const active = document.getElementById('btn-' + lang);
    if (active) active.classList.add('active');

    try { localStorage.setItem('obs-lang', lang); } catch (e) {}
}

function initLang() {
    let saved = null;
    try { saved = localStorage.getItem('obs-lang'); } catch (e) {}
    const initial = I18N[saved] ? saved : 'pt';
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => setLanguage(btn.getAttribute('data-lang')));
    });
    setLanguage(initial);
}

/* ---------- Agente IA ---------- */
let chatBusy = false;
let micSupported = true; // false cuando el navegador no soporta Web Speech API

function addMsg(text, who) {
    const log = document.getElementById('chat-log');
    if (!log) return;
    const div = document.createElement('div');
    div.className = 'chat-msg ' + who;
    if (who === 'agent' && mdReady) {
        // El texto se escapa ANTES de parsearlo: ni el usuario ni el agente
        // pueden inyectar HTML arbitrario en el chat.
        div.innerHTML = marked.parse(escapeHtml(text));
    } else {
        div.innerText = text;
    }
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
}

function showTyping() {
    const log = document.getElementById('chat-log');
    if (!log) return null;
    const div = document.createElement('div');
    div.className = 'chat-typing';
    div.id = 'chat-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
}

function hideTyping() {
    const div = document.getElementById('chat-typing');
    if (div) div.remove();
}

function setChatBusy(busy) {
    chatBusy = busy;
    const input = document.getElementById('chat-input');
    const send = document.getElementById('chat-send');
    const mic = document.getElementById('chat-mic');
    if (input) input.disabled = busy;
    if (send) send.disabled = busy;
    if (mic && micSupported) mic.disabled = busy; // no se toca si el navegador no soporta voz
}

async function sendChat() {
    if (chatBusy) return; // no se permite enviar otro mensaje hasta que conteste
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, 'user');
    input.value = '';

    if (CONFIG.apiUrl) {
        setChatBusy(true);
        showTyping();
        try {
            const resp = await fetch(CONFIG.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, lang: currentLang })
            });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const data = await resp.json();
            hideTyping();
            addMsg(data.reply || t('agentWaiting'), 'agent');
        } catch (e) {
            hideTyping();
            addMsg(t('agentError'), 'agent');
        } finally {
            setChatBusy(false);
            if (input) input.focus();
        }
    } else {
        setTimeout(() => addMsg(t('agentWaiting'), 'agent'), 500);
    }
}

/* ---------- Micrófono (Web Speech API) ---------- */
let recognition = null;
let listening = false;

function initMic() {
    const micBtn = document.getElementById('chat-mic');
    const input = document.getElementById('chat-input');
    if (!micBtn || !input) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        micSupported = false;
        micBtn.disabled = true;
        micBtn.title = t('micUnsupported');
        return;
    }

    recognition = new SR();
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        input.value = transcript;
    };
    recognition.onend = () => {
        listening = false;
        micBtn.classList.remove('mic-listening');
    };
    recognition.onerror = () => {
        listening = false;
        micBtn.classList.remove('mic-listening');
    };

    micBtn.addEventListener('click', () => {
        if (listening) {
            recognition.stop();
            return;
        }
        recognition.lang = SPEECH_LANGS[currentLang] || 'pt-BR';
        try {
            recognition.start();
            listening = true;
            micBtn.classList.add('mic-listening');
        } catch (e) { /* start() pode lançar se chamado duas vezes */ }
    });
}

function initChat() {
    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');
    if (sendBtn) sendBtn.addEventListener('click', sendChat);
    if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
    initMic();
}

document.addEventListener('DOMContentLoaded', () => {
    initLang();
    initChat();
});
