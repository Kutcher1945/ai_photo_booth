'use client'

import { useState } from 'react'
import WelcomeScreen from '@/components/screens/WelcomeScreen'
import ModeSelectScreen from '@/components/screens/ModeSelectScreen'
import DeliveryMethodScreen, { type DeliveryMethod } from '@/components/screens/DeliveryMethodScreen'
import CameraScreen from '@/components/screens/CameraScreen'
import PreviewScreen from '@/components/screens/PreviewScreen'
import SendPhotoScreen from '@/components/screens/SendPhotoScreen'
import SuccessScreen from '@/components/screens/SuccessScreen'

export type Screen = 'welcome' | 'mode-select' | 'delivery-method' | 'camera' | 'preview' | 'send' | 'success'
export type PhotoMode = 'single' | 'series' | 'filters' | 'background'

export default function PhotoBoothApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome')
  const [selectedMode, setSelectedMode] = useState<PhotoMode>('single')
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('email')
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([])

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen)
  }

  const handleModeSelect = (mode: PhotoMode) => {
    setSelectedMode(mode)
    setCurrentScreen('delivery-method')
  }

  const handleDeliveryMethodSelect = (method: DeliveryMethod) => {
    setDeliveryMethod(method)
    setCurrentScreen('camera')
  }

  const handlePhotosCapture = (photos: string[]) => {
    setCapturedPhotos(photos)
    setCurrentScreen('preview')
  }

  const handleRetake = () => {
    setCapturedPhotos([])
    setCurrentScreen('camera')
  }

  const handleSendPhotos = () => {
    setCurrentScreen('send')
  }

  const handlePhotosSent = () => {
    setCurrentScreen('success')
  }

  const handleReset = () => {
    setCapturedPhotos([])
    setSelectedMode('single')
    setDeliveryMethod('email')
    setCurrentScreen('welcome')
  }

  return (
    <div className="min-h-screen bg-background">
      {currentScreen === 'welcome' && (
        <WelcomeScreen onStart={() => handleNavigate('mode-select')} />
      )}
      {currentScreen === 'mode-select' && (
        <ModeSelectScreen 
          onSelectMode={handleModeSelect}
          onBack={() => handleNavigate('welcome')}
        />
      )}
      {currentScreen === 'delivery-method' && (
        <DeliveryMethodScreen
          onSelectMethod={handleDeliveryMethodSelect}
          onBack={() => handleNavigate('mode-select')}
        />
      )}
      {currentScreen === 'camera' && (
        <CameraScreen 
          mode={selectedMode}
          onPhotosCapture={handlePhotosCapture}
          onBack={() => handleNavigate('delivery-method')}
        />
      )}
      {currentScreen === 'preview' && (
        <PreviewScreen
          photos={capturedPhotos}
          onRetake={handleRetake}
          onSend={handleSendPhotos}
        />
      )}
      {currentScreen === 'send' && (
        <SendPhotoScreen
          photos={capturedPhotos}
          deliveryMethod={deliveryMethod}
          onSent={handlePhotosSent}
          onBack={() => handleNavigate('preview')}
        />
      )}
      {currentScreen === 'success' && (
        <SuccessScreen onReset={handleReset} />
      )}
    </div>
  )
}
