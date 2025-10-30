import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ContainerOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Menu } from 'antd';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ activeTabProp, children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState(activeTabProp || 'data');
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Perbarui activeTab ketika activeTabProp berubah
  useEffect(() => {
    if (activeTabProp) {
      setActiveTab(activeTabProp);
    }
  }, [activeTabProp]);

  // Fungsi untuk toggle sidebar
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  // Fungsi untuk mengubah tab dan URL
  const handleMenuClick = (e) => {
    const key = e.key;
    
    // Handle logout
    if (key === 'logout') {
      if (window.confirm('Apakah Anda yakin ingin logout?')) {
        logout();
        navigate('/login');
      }
      return;
    }
    
    setActiveTab(key);
    
    // Navigasi ke halaman yang sesuai
    if (key === 'data') {
      navigate('/data');
    } else if (key === 'visualisasi') {
      navigate('/visualisasi');
    } else if (key === 'analisis') {
      navigate('/analisis');
    }
  };

  // Definisi item menu berdasarkan role user
  const getMenuItems = () => {
    const baseItems = [];
    
    // Menu Katalog Data - Hanya untuk Admin dan Analis
    if (user && (user.role === 'Admin' || user.role === 'Analis')) {
      baseItems.push({ 
        key: 'data', 
        icon: <DatabaseOutlined />, 
        label: 'Katalog Data' 
      });
    }
    
    // Menu Katalog Visualisasi - Untuk semua role
    baseItems.push({ 
      key: 'visualisasi', 
      icon: <BarChartOutlined />, 
      label: 'Katalog Visualisasi' 
    });
    
    // Menu Katalog Analisis - Untuk semua role
    baseItems.push({ 
      key: 'analisis', 
      icon: <ContainerOutlined />, 
      label: 'Katalog Analisis' 
    });

    // Tambahkan item logout di bagian bawah
    return [
      ...baseItems,
      {
        type: 'divider',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Logout',
        danger: true,
      },
    ];
  };

  // Fungsi untuk mendapatkan warna badge berdasarkan role
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Admin':
        return '#f44336'; // Merah
      case 'Analis':
        return '#2196F3'; // Biru
      case 'EndUser':
        return '#4CAF50'; // Hijau
      default:
        return '#9e9e9e'; // Abu-abu
    }
  };

  return (
    <>
      <div className={`sidebar ${collapsed ? 'closed' : 'open'}`}>
        <Button
          type="primary"
          onClick={toggleCollapsed}
          className="sidebar-toggle"
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </Button>

        {/* Info User - Hanya tampil saat sidebar terbuka */}
        {!collapsed && user && (
          <div style={{
            padding: '20px 16px',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#f5f5f5',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <UserOutlined style={{ fontSize: '28px', color: '#1976d2' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '6px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {user.nama_lengkap}
                </div>
                <div style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontWeight: '500',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  backgroundColor: getRoleBadgeColor(user.role),
                  color: 'white'
                }}>
                  {user.role}
                </div>
              </div>
            </div>
          </div>
        )}

        <Menu
          selectedKeys={[activeTab]}
          mode="inline"
          theme="light"
          inlineCollapsed={collapsed}
          items={getMenuItems()}
          onClick={handleMenuClick}
          className="sidebar-content"
        />
      </div>
      
      <div className={`main-content ${collapsed ? 'full-width' : 'with-sidebar'}`}>
        {children}
      </div>
    </>
  );
};

export default Sidebar;