document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const audio = new Audio();
    const playBtn = document.getElementById('play-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const progressBar = document.querySelector('.progress-bar');
    const progressFill = document.querySelector('.progress-fill');
    const progressThumb = document.querySelector('.progress-thumb');
    const currentTimeEl = document.querySelector('.current-time');
    const durationEl = document.querySelector('.duration');
    const songTitle = document.querySelector('.song-title');
    const artistEl = document.querySelector('.artist');
    const albumEl = document.querySelector('.album');
    const albumArt = document.querySelector('.album-art');
    const playlistEl = document.getElementById('playlist');
    const fileInput = document.getElementById('file-input');
    const addFilesBtn = document.getElementById('add-files-btn');
    const clearPlaylistBtn = document.getElementById('clear-playlist-btn');
    const lyricsBtn = document.getElementById('lyrics-btn');
    const lyricsModal = document.querySelector('.lyrics-modal');
    const closeLyrics = document.querySelector('.close-lyrics');
    const lyricsText = document.querySelector('.lyrics-text');
    const visualizerBars = document.querySelectorAll('.visualizer .bar');
    const themeOptions = document.querySelectorAll('.theme-option');
    const playerContainer = document.querySelector('.music-player');
    
    // Player state
    let isPlaying = false;
    let currentSongIndex = 0;
    let songs = [];
    let isShuffled = false;
    let isRepeated = false;
    let originalPlaylistOrder = [];
    let audioContext;
    let analyser;
    let dataArray;
    let animationId;
    
    // Initialize player
    function initPlayer() {
        setupEventListeners();
        setupAudioContext();
        setVisualizerBars();
        setTheme('default');
    }
    
    function setupEventListeners() {
        // Button events
        playBtn.addEventListener('click', togglePlay);
        prevBtn.addEventListener('click', prevSong);
        nextBtn.addEventListener('click', nextSong);
        shuffleBtn.addEventListener('click', toggleShuffle);
        repeatBtn.addEventListener('click', toggleRepeat);
        volumeSlider.addEventListener('input', setVolume);
        addFilesBtn.addEventListener('click', () => fileInput.click());
        clearPlaylistBtn.addEventListener('click', clearPlaylist);
        lyricsBtn.addEventListener('click', toggleLyrics);
        closeLyrics.addEventListener('click', toggleLyrics);
        
        // Progress bar events
        progressBar.addEventListener('click', setProgress);
        progressBar.addEventListener('mousemove', showProgressThumb);
        progressBar.addEventListener('mouseleave', hideProgressThumb);
        
        // File input event
        fileInput.addEventListener('change', handleFileUpload);
        
        // Audio events
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', handleSongEnd);
        audio.addEventListener('loadedmetadata', updateSongInfo);
        audio.addEventListener('play', updateVisualizer);
        audio.addEventListener('pause', cancelVisualizer);
        
        // Theme events
        themeOptions.forEach(option => {
            option.addEventListener('click', () => setTheme(option.dataset.theme));
        });
    }
    
    function setupAudioContext() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 64;
            const source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        } catch (e) {
            console.error('Audio Context not supported', e);
        }
    }
    
    function setVisualizerBars() {
        visualizerBars.forEach((bar, i) => {
            bar.style.setProperty('--i', i);
        });
    }
    
    function updateVisualizer() {
        if (!analyser) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        visualizerBars.forEach((bar, i) => {
            const value = dataArray[i] / 255;
            const height = value * 30;
            bar.style.height = `${10 + height}px`;
            bar.style.opacity = `${0.1 + value * 0.9}`;
        });
        
        animationId = requestAnimationFrame(updateVisualizer);
    }
    
    function cancelVisualizer() {
        cancelAnimationFrame(animationId);
        visualizerBars.forEach(bar => {
            bar.style.height = '10px';
            bar.style.opacity = '0.3';
        });
    }
    
    function setTheme(theme) {
        document.documentElement.className = `theme-${theme}`;
        // Save theme preference
        localStorage.setItem('musicPlayerTheme', theme);
    }
    
    function loadTheme() {
        const savedTheme = localStorage.getItem('musicPlayerTheme') || 'default';
        setTheme(savedTheme);
    }
    
    // Toggle play/pause
    function togglePlay() {
        if (songs.length === 0) return showNotification('Add some songs first!');
        
        if (isPlaying) {
            audio.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            playerContainer.classList.remove('playing');
        } else {
            audio.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            playerContainer.classList.add('playing');
            // Resume audio context if suspended
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
        }
        isPlaying = !isPlaying;
    }
    
    // Play song
    function playSong(index) {
        if (songs.length === 0) return;
        
        currentSongIndex = index;
        const song = songs[index];
        
        audio.src = song.url;
        audio.play()
            .then(() => {
                isPlaying = true;
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                playerContainer.classList.add('playing');
                updateSongInfo();
                updatePlaylistUI();
                // Resume audio context if suspended
                if (audioContext && audioContext.state === 'suspended') {
                    audioContext.resume();
                }
            })
            .catch(error => {
                console.error('Playback failed:', error);
                showNotification('Playback failed. Please try another song.');
            });
    }
    
    // Previous song
    function prevSong() {
        if (songs.length === 0) return;
        
        currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        playSong(currentSongIndex);
    }
    
    // Next song
    function nextSong() {
        if (songs.length === 0) return;
        
        if (isRepeated) {
            playSong(currentSongIndex);
        } else {
            currentSongIndex = (currentSongIndex + 1) % songs.length;
            playSong(currentSongIndex);
        }
    }
    
    function handleSongEnd() {
        if (isRepeated) {
            playSong(currentSongIndex);
        } else {
            nextSong();
        }
    }
    
    function toggleShuffle() {
        isShuffled = !isShuffled;
        shuffleBtn.classList.toggle('active', isShuffled);
        
        if (isShuffled) {
            // Save original order
            originalPlaylistOrder = [...songs];
            // Shuffle songs
            shuffleArray(songs);
            // Update playlist UI
            updatePlaylistUI();
            showNotification('Playlist shuffled');
        } else {
            // Restore original order
            if (originalPlaylistOrder.length > 0) {
                songs = [...originalPlaylistOrder];
                updatePlaylistUI();
                showNotification('Playlist order restored');
            }
        }
    }
    
    function toggleRepeat() {
        isRepeated = !isRepeated;
        repeatBtn.classList.toggle('active', isRepeated);
        showNotification(isRepeated ? 'Repeat: ON' : 'Repeat: OFF');
    }
    
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    // Set volume
    function setVolume() {
        audio.volume = volumeSlider.value;
        // Update volume icon
        const volumeIcons = document.querySelectorAll('.volume-control i');
        if (audio.volume === 0) {
            volumeIcons.forEach(icon => icon.className = 'fas fa-volume-mute');
        } else if (audio.volume < 0.5) {
            volumeIcons.forEach(icon => icon.className = 'fas fa-volume-down');
        } else {
            volumeIcons.forEach(icon => icon.className = 'fas fa-volume-up');
        }
    }
    
    // Update progress bar
    function updateProgress() {
        const { duration, currentTime } = audio;
        const progressPercent = (currentTime / duration) * 100 || 0;
        progressFill.style.width = `${progressPercent}%`;
        
        // Update time display
        currentTimeEl.textContent = formatTime(currentTime);
        if (duration) {
            durationEl.textContent = formatTime(duration);
        }
    }
    
    // Set progress bar on click
    function setProgress(e) {
        if (!audio.duration) return;
        
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = audio.duration;
        audio.currentTime = (clickX / width) * duration;
    }
    
    function showProgressThumb(e) {
        if (!audio.duration) return;
        
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const percent = (clickX / width) * 100;
        progressThumb.style.left = `${percent}%`;
        progressThumb.style.opacity = '1';
    }
    
    function hideProgressThumb() {
        progressThumb.style.opacity = '0';
    }
    
    // Update song info
    function updateSongInfo() {
        if (songs.length === 0) return;
        
        const currentSong = songs[currentSongIndex];
        songTitle.textContent = currentSong.name;
        artistEl.textContent = currentSong.artist || 'Unknown Artist';
        albumEl.textContent = currentSong.album || 'Unknown Album';
        
        // Try to extract album art from metadata
        if (currentSong.file) {
            extractMetadata(currentSong.file);
        }
        
        // Update document title
        document.title = `${currentSong.name} - Nexus Player`;
    }
    
    function extractMetadata(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            
            try {
                // Try to read ID3 tags if the file is MP3
                if (file.type === 'audio/mpeg') {
                    const tags = ID3.parse(arrayBuffer);
                    if (tags.TIT2) songs[currentSongIndex].name = tags.TIT2;
                    if (tags.TPE1) songs[currentSongIndex].artist = tags.TPE1;
                    if (tags.TALB) songs[currentSongIndex].album = tags.TALB;
                    
                    // Update album art if available
                    if (tags.APIC) {
                        const blob = new Blob([tags.APIC.data], {type: tags.APIC.format});
                        const url = URL.createObjectURL(blob);
                        albumArt.src = url;
                    }
                    
                    // Update UI with new metadata
                    updateSongInfo();
                }
            } catch (e) {
                console.log('Metadata parsing failed, using default info');
            }
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    // Handle file upload
    function handleFileUpload(e) {
        const files = Array.from(e.target.files);
        
        if (files.length === 0) return;
        
        files.forEach(file => {
            if (file.type.startsWith('audio/')) {
                const song = {
                    name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                    artist: 'Unknown Artist',
                    album: 'Unknown Album',
                    url: URL.createObjectURL(file),
                    file: file
                };
                songs.push(song);
                
                // Add to playlist
                addSongToPlaylist(song);
            }
        });
        
        // Play first song if none is playing
        if (songs.length > 0 && !audio.src) {
            playSong(0);
        }
        
        showNotification(`Added ${files.length} song(s)`);
        
        // Reset file input
        fileInput.value = '';
    }
    
    function addSongToPlaylist(song) {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="song-name">${song.name}</span>
            <span class="song-duration">0:00</span>
        `;
        li.addEventListener('click', () => {
            const index = songs.indexOf(song);
            playSong(index);
        });
        playlistEl.appendChild(li);
    }
    
    function clearPlaylist() {
        if (songs.length === 0) return;
        
        if (confirm('Are you sure you want to clear the playlist?')) {
            songs = [];
            playlistEl.innerHTML = '';
            audio.src = '';
            isPlaying = false;
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            playerContainer.classList.remove('playing');
            songTitle.textContent = 'No song selected';
            artistEl.textContent = 'Artist';
            albumEl.textContent = 'Album';
            albumArt.src = 'assets/default-art.jpg';
            currentTimeEl.textContent = '0:00';
            durationEl.textContent = '0:00';
            progressFill.style.width = '0%';
            showNotification('Playlist cleared');
        }
    }
    
    // Update playlist UI
    function updatePlaylistUI() {
        const items = playlistEl.querySelectorAll('li');
        items.forEach((item, index) => {
            item.classList.toggle('playing', index === currentSongIndex);
            
            // Update duration if available
            if (songs[index] && audio.duration) {
                const durationEl = item.querySelector('.song-duration');
                durationEl.textContent = formatTime(audio.duration);
            }
        });
    }
    
    function toggleLyrics() {
        lyricsModal.classList.toggle('active');
        
        if (lyricsModal.classList.contains('active')) {
            // In a real app, you would fetch lyrics here
            lyricsText.textContent = "Lyrics for this song are not available.\n\nThis is a demo player. In a real application, you would integrate with a lyrics API or parse lyric files.";
        }
    }
    
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Format time (seconds to MM:SS)
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }
    
    // Initialize the player
    initPlayer();
    loadTheme();

    // Add some CSS for notifications
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--primary-color);
            color: white;
            padding: 12px 25px;
            border-radius: 25px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        .notification.show {
            opacity: 1;
        }
        
        .control-btn.active {
            background: linear-gradient(to bottom, var(--primary-color), var(--secondary-color)) !important;
            color: white !important;
            box-shadow: 0 0 10px rgba(108, 92, 231, 0.5);
        }
    `;
    document.head.appendChild(style);
});
