# app.py

from flask import Flask, request, redirect, session, url_for, jsonify, send_from_directory
from dotenv import load_dotenv # Para carregar variáveis de ambiente
import os
import spotipy # Biblioteca para interagir com a API do Spotify
from spotipy.oauth2 import SpotifyOAuth # Auxilia no fluxo OAuth do Spotify

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

app = Flask(__name__, static_folder='.') # <-- ESTA LINHA É CRÍTICA!
# A secret_key é usada para criptografar os dados da sessão.
# GERE UMA CHAVE SECRETA FORTE E MANTENHA-A SEGURA!
app.secret_key = os.environ.get("FLASK_SECRET_KEY", os.urandom(24))

# Credenciais do Spotify (obtidas do seu dashboard de desenvolvedor)
# Use variáveis de ambiente para segurança!
SPOTIPY_CLIENT_ID = os.environ.get("62fbeb2cc90ef7c090d731481d9579e341b43e7f8e8b9367")
SPOTIPY_CLIENT_SECRET = os.environ.get("62fbeb2cc90ef7c090d731481d9579e341b43e7f8e8b9367")
# **IMPORTANTE**: Esta URL deve ser exatamente a mesma configurada no Spotify for Developers
SPOTIPY_REDIRECT_URI = os.environ.get("http://127.0.0.1:5000/callback/spotify", "http://127.0.0.1:5000/callback/spotify")

# Scopes (permissões) que seu aplicativo precisa do Spotify
SCOPE = "user-read-private user-read-email playlist-read-private playlist-modify-public playlist-modify-private"

# Configura o objeto SpotifyOAuth
sp_oauth = SpotifyOAuth(client_id=SPOTIPY_CLIENT_ID,
                        client_secret=SPOTIPY_CLIENT_SECRET,
                        redirect_uri=SPOTIPY_REDIRECT_URI,
                        scope=SCOPE)

# Rota para servir o arquivo principal (index.html)
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

# Rota para servir outros arquivos estáticos (CSS, JS)
@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory(app.static_folder, filename)

# Rota para iniciar o fluxo de autenticação do Spotify
@app.route('/api/auth/spotify')
def auth_spotify():
    auth_url = sp_oauth.get_authorize_url()
    return redirect(auth_url)

# Rota de callback do Spotify após o usuário autorizar o aplicativo
@app.route('/callback/spotify')
def spotify_callback():
    code = request.args.get('code')
    if code:
        token_info = sp_oauth.get_access_token(code)
        session['spotify_token_info'] = token_info
    return redirect(url_for('index'))

# Rota para testar o status da conexão do Spotify
@app.route('/api/status/spotify')
def spotify_status():
    token_info = session.get('spotify_token_info')
    if token_info and sp_oauth.validate_token(token_info):
        return jsonify({"connected": True, "message": "Conectado ao Spotify."})
    return jsonify({"connected": False, "message": "Não conectado ao Spotify."})

# Rota para obter as playlists do usuário logado no Spotify
@app.route('/api/playlists/spotify')
def get_spotify_playlists():
    token_info = session.get('spotify_token_info')

    if not token_info or not sp_oauth.validate_token(token_info):
        if token_info and 'refresh_token' in token_info:
            try:
                new_token_info = sp_oauth.refresh_access_token(token_info['refresh_token'])
                session['spotify_token_info'] = new_token_info
                token_info = new_token_info
            except Exception as e:
                session.pop('spotify_token_info', None)
                return jsonify({"message": "Sessão Spotify expirada. Por favor, conecte-se novamente."}), 401
        else:
            return jsonify({"message": "Spotify não conectado ou sessão expirada. Por favor, conecte-se primeiro."}), 401

    sp = spotipy.Spotify(auth=token_info['access_token'])

    try:
        playlists = sp.current_user_playlists(limit=50)
        formatted_playlists = [{"id": p["id"], "name": p["name"]} for p in playlists["items"]]
        return jsonify({"playlists": formatted_playlists})
    except spotipy.exceptions.SpotifyException as e:
        return jsonify({"message": f"Erro da API Spotify ao buscar playlists: {e.reason}"}), e.http_status
    except Exception as e:
        return jsonify({"message": f"Erro inesperado ao buscar playlists: {e}"}), 500

# Rota para iniciar a transferência da playlist
@app.route('/api/transfer-playlist', methods=['POST'])
def transfer_playlist():
    token_info = session.get('spotify_token_info')

    if not token_info or not sp_oauth.validate_token(token_info):
        if token_info and 'refresh_token' in token_info:
            try:
                new_token_info = sp_oauth.refresh_access_token(token_info['refresh_token'])
                session['spotify_token_info'] = new_token_info
                token_info = new_token_info
            except Exception as e:
                session.pop('spotify_token_info', None)
                return jsonify({"message": "Sessão Spotify expirada para transferência. Conecte-se novamente."}), 401
        else:
            return jsonify({"message": "Spotify não conectado para transferência. Por favor, conecte-se primeiro."}), 401

    sp = spotipy.Spotify(auth=token_info['access_token'])

    data = request.json
    source_platform = data.get('source_platform')
    source_playlist_id = data.get('source_playlist_id')
    dest_platform = data.get('dest_platform')
    dest_playlist_name = data.get('dest_playlist_name')

    if source_platform != 'spotify' or dest_platform != 'spotify':
        return jsonify({"message": "Por enquanto, apenas transferências de Spotify para Spotify são suportadas neste exemplo."}), 400

    if not source_playlist_id or not dest_playlist_name:
        return jsonify({"message": "Dados de playlist insuficientes para transferência."}), 400

    try:
        track_uris = []
        results = sp.playlist_items(source_playlist_id, fields='items.track.uri,total,next')
        track_uris.extend([item['track']['uri'] for item in results['items'] if item['track'] and item['track']['uri']])

        while results['next']:
            results = sp.next(results)
            track_uris.extend([item['track']['uri'] for item in results['items'] if item['track'] and item['track']['uri']])

        if not track_uris:
            return jsonify({"message": "A playlist de origem está vazia ou não contém músicas válidas."}), 404

        user_id = sp.current_user()['id']

        new_playlist = sp.user_playlist_create(user_id, dest_playlist_name, public=False,
                                               description=f"Transferida via Transferidor de Playlists.")
        new_playlist_id = new_playlist['id']

        for i in range(0, len(track_uris), 100):
            batch = track_uris[i:i+100]
            sp.playlist_add_items(new_playlist_id, batch)

        return jsonify({"message": f"Playlist '{dest_playlist_name}' criada e músicas transferidas com sucesso!",
                        "new_playlist_url": new_playlist['external_urls']['spotify']}), 200

    except spotipy.exceptions.SpotifyException as e:
        return jsonify({"message": f"Erro da API Spotify durante a transferência: {e.reason}"}), e.http_status
    except Exception as e:
        return jsonify({"message": f"Erro inesperado durante a transferência: {e}"}), 500

# Onde o aplicativo começa a rodar
if __name__ == '__main__':
    app.run(debug=True, port=5000)