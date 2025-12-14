(function(){
    const AUDIO_SRC = '/static/audio/stardew_theme.mp3';
    let audio = null;
    let playing = false;

    function getSavedVolume(){
        try{
            const s = JSON.parse(localStorage.getItem('farmSettings')||'{}');
            return (s.volume !== undefined) ? (Number(s.volume)/100) : 0.8;
        }catch(e){ return 0.8; }
    }

    function createAudio(){
        if(audio) return audio;
        audio = document.createElement('audio');
        audio.id = 'bgMusic';
        audio.src = AUDIO_SRC;
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = getSavedVolume();
        audio.crossOrigin = 'anonymous';
        document.body.appendChild(audio);
        window.bgMusic = audio;
        return audio;
    }

    function createControl(){
        const btn = document.createElement('button');
        btn.className = 'music-control';
        btn.title = 'Play / Pause music';
        btn.innerText = '🔈';
        btn.addEventListener('click', async (e)=>{
            e.stopPropagation();
            const a = createAudio();
            if(a.paused){
                try{ await a.play(); playing = true; btn.innerText = '⏸️'; localStorage.setItem('farmMusicPlaying','1'); }catch(err){ console.warn('Autoplay prevented'); }
            }else{
                a.pause(); playing = false; btn.innerText = '🔈'; localStorage.setItem('farmMusicPlaying','0');
            }
        });
        document.body.appendChild(btn);
        return btn;
    }

    function init(){
        createControl();
        // If user previously enabled playing, wait for a gesture then play
        const shouldPlay = localStorage.getItem('farmMusicPlaying') === '1';
        // Listen for first gesture to attempt autoplay if desired
        function oneGesture(){
            document.removeEventListener('click', oneGesture);
            if(shouldPlay){
                const a = createAudio();
                a.play().then(()=>{
                    const btn = document.querySelector('.music-control');
                    if(btn) btn.innerText = '⏸️';
                    playing = true;
                }).catch(e=>{
                    console.warn('Autoplay blocked', e);
                });
            }
        }
        document.addEventListener('click', oneGesture);

        // react to volume changes saved by settings
        window.addEventListener('storage', (ev)=>{
            if(ev.key === 'farmSettings'){
                const a = audio || document.getElementById('bgMusic');
                if(a){
                    try{ const s = JSON.parse(ev.newValue||'{}'); if(s.volume!==undefined) a.volume = Number(s.volume)/100; }catch(e){}
                }
            }
            if(ev.key === 'farmMusicPlaying'){
                const val = ev.newValue === '1';
                const a = audio || document.getElementById('bgMusic');
                const btn = document.querySelector('.music-control');
                if(a && btn){
                    if(val){ a.play().then(()=> btn.innerText='⏸️').catch(()=>{}); }
                    else { a.pause(); btn.innerText='🔈'; }
                }
            }
        });
    }

    // Initialize when DOM ready
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();

