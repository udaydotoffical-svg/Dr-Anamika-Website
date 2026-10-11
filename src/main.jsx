import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource-variable/manrope'
import './styles.css'
import App from './App.jsx'
import MyBooking from './components/MyBooking.jsx'

const Page = location.pathname.replace(/\/$/, '') === '/my' ? MyBooking : App
if (Page === MyBooking) document.head.insertAdjacentHTML('beforeend', '<meta name="robots" content="noindex, nofollow">')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
