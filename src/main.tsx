import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Home from './pages/Home'
import Display from './pages/Display'
import Controller from './pages/Controller'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/controller/:roomCode" element={<Controller />} />
        <Route path="/display/:roomCode" element={<Display />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)