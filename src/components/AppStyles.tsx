import React from 'react';
import appStyles from '../styles/App.styles';

const AppStyles: React.FC = () => <style>{appStyles}</style>;

export default React.memo(AppStyles);
