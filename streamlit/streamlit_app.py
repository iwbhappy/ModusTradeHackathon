"""«Сигнал» в Streamlit: интерфейс на демо-данных, собранный в один HTML.

Сборка: из frontend/ выполнить `npm run build:streamlit` (пишет streamlit/build/index.html).
Запуск: `streamlit run streamlit/streamlit_app.py`.
"""

from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

BUILD = Path(__file__).parent / "build" / "index.html"

st.set_page_config(page_title="Сигнал — обратная связь сотрудников", layout="wide", initial_sidebar_state="collapsed")

# Интерфейс занимает всё окно: прячем шапку Streamlit и отступы, iframe — на высоту экрана.
st.markdown(
    """
    <style>
      header[data-testid="stHeader"], footer, #MainMenu { display: none !important; }
      .stMainBlockContainer, .block-container { padding: 0 !important; max-width: 100% !important; }
      [data-testid="stAppViewContainer"] iframe { height: 100vh !important; display: block; }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_resource
def load_app() -> str:
    return BUILD.read_text(encoding="utf-8")


if not BUILD.exists():
    st.error("Нет сборки интерфейса: выполните `npm run build:streamlit` в папке frontend.")
else:
    components.html(load_app(), height=900, scrolling=True)
