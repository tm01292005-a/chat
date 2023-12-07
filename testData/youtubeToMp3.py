# pip install yt-dlp
from yt_dlp import YoutubeDL

ydl_video_opts = {
    'outtmpl': '%(id)s'+'_.mp3',
    'format': 'bestaudio'
}

with YoutubeDL(ydl_video_opts) as ydl:
    result = ydl.download([
        'https://www.youtube.com/watch?v=enE-Z2GZXZs',
])
