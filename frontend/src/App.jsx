import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Spin } from 'antd'
import LoginPage from './pages/LoginPage'
import MainLayout from './layouts/MainLayout'
import MapPage from './pages/MapPage'
import BatteryPage from './pages/BatteryPage'
import WorkOrderPage from './pages/WorkOrderPage'
import PathPage from './pages/PathPage'
import StatsPage from './pages/StatsPage'

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="/map" replace />} />
        <Route path="map" element={<MapPage />} />
        <Route path="batteries" element={<BatteryPage />} />
        <Route path="work-orders" element={<WorkOrderPage />} />
        <Route path="path" element={<PathPage />} />
        <Route path="stats" element={<StatsPage />} />
      </Route>
    </Routes>
  )
}

export default App
