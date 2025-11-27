// Translation object with English and Japanese strings
export const translations = {
    en: {
        // Navigation
        dashboard: 'Dashboard',
        analysis: 'Analysis',
        rapsodoAnalysis: 'Rapsodo Analysis',
        uploadData: 'Upload Data',
        settings: 'Settings',
        teams: 'Teams',

        // Rapsodo Page
        rapsodoAnalysisTitle: 'Rapsodo Analysis',
        selectTeam: 'Select Team',
        team: 'Team',
        player: 'Player',
        teamAverage: 'Team Average / All',
        importedTeam: 'Imported Team',
        startDate: 'Start Date',
        endDate: 'End Date',
        pitching: 'Pitching',
        batting: 'Batting',
        pleaseSelectTeam: 'Please select a team to view data',
        chooseTeamFromDropdown: 'Choose a team from the dropdown above',

        // Pitching Dashboard
        totalPitches: 'Total Pitches',
        avgVelocity: 'Avg Velocity',
        maxSpin: 'Max Spin',
        avgSpinEfficiency: 'Avg Spin Efficiency',
        velocityVsSpin: 'Velocity vs Spin Rate',
        pitchMovement: 'Pitch Movement',
        releasePoint: 'Release Point',
        horizontalBreak: 'Horizontal Break',
        verticalBreak: 'Vertical Break',
        releaseSide: 'Release Side',
        releaseHeight: 'Release Height',
        pitchTypeSummary: 'Pitch Type Summary',
        pitchType: 'Pitch Type',
        count: 'Count',
        velocity: 'Velocity',
        spinRate: 'Spin Rate',
        horzBreak: 'Horz Break',
        vertBreak: 'Vert Break',

        // Batting Dashboard
        avgExitVelocity: 'Avg Exit Velocity',
        maxExitVelocity: 'Max Exit Velocity',
        avgDistance: 'Avg Distance',
        maxDistance: 'Max Distance',
        maxLaunchAngle: 'Max Launch Angle',
        exitVelVsLaunchAngle: 'Exit Velocity vs Launch Angle',
        hitDistribution: 'Hit Distribution',
        exitVelocity: 'Exit Velocity',
        launchAngle: 'Launch Angle',
        distance: 'Distance',

        // Upload Page
        uploadDataTitle: 'Upload Data',
        selectDataFormat: 'Select Data Format',
        rapsodo: 'Rapsodo',
        baseballSavant: 'Baseball Savant',
        fileType: 'File Type',
        uploadCSVFile: 'Upload CSV File',
        dragAndDrop: 'Drag and drop your CSV file here',
        or: 'or',
        browseFiles: 'Browse Files',
        uploadDataButton: 'Upload Data',
        dataPreview: 'Data Preview (First 10 Rows)',
        successUpload: 'Successfully uploaded',
        rowsOf: 'rows of',
        data: 'data',
        pleaseSelectFile: 'Please select a file first.',
        pleaseUploadCSV: 'Please upload a CSV file.',
        failedToParse: 'Failed to parse CSV',

        // Settings Page
        settingsTitle: 'Settings',
        languageSettings: 'Language Settings',
        selectLanguage: 'Select Language',
        english: 'English',
        japanese: 'Japanese',
        unitSettings: 'Unit Settings',
        selectUnits: 'Select Units',
        imperial: 'Imperial (mph, ft, in)',
        metric: 'Metric (km/h, m, cm)',
        currentSettings: 'Current Settings',
        language: 'Language',
        units: 'Units',

        // Teams Page
        viewRoster: 'View Roster',
        viewImportedData: 'View imported pitching & batting data',
        goToDashboard: 'Go to Dashboard',

        // Common
        loading: 'Loading',
        loadingData: 'Loading Data...',
        loadingRapsodoData: 'Loading Rapsodo Data...',
    },
    ja: {
        // Navigation
        dashboard: 'ダッシュボード',
        analysis: '分析',
        rapsodoAnalysis: 'Rapsodo分析',
        uploadData: 'データアップロード',
        settings: '設定',
        teams: 'チーム',

        // Rapsodo Page
        rapsodoAnalysisTitle: 'Rapsodo分析',
        selectTeam: 'チームを選択',
        team: 'チーム',
        player: '選手',
        teamAverage: 'チーム平均 / 全員',
        importedTeam: 'インポートされたチーム',
        startDate: '開始日',
        endDate: '終了日',
        pitching: 'ピッチング',
        batting: 'バッティング',
        pleaseSelectTeam: 'データを表示するにはチームを選択してください',
        chooseTeamFromDropdown: '上のドロップダウンからチームを選択してください',

        // Pitching Dashboard
        totalPitches: '総投球数',
        avgVelocity: '平均球速',
        maxSpin: '最大回転数',
        avgSpinEfficiency: '平均回転効率',
        velocityVsSpin: '球速 vs 回転数',
        pitchMovement: '球の変化',
        releasePoint: 'リリースポイント',
        horizontalBreak: '横変化',
        verticalBreak: '縦変化',
        releaseSide: 'リリース横位置',
        releaseHeight: 'リリース高さ',
        pitchTypeSummary: '球種別サマリー',
        pitchType: '球種',
        count: '投球数',
        velocity: '球速',
        spinRate: '回転数',
        horzBreak: '横変化',
        vertBreak: '縦変化',

        // Batting Dashboard
        avgExitVelocity: '平均打球速度',
        maxExitVelocity: '最大打球速度',
        avgDistance: '平均飛距離',
        maxDistance: '最大飛距離',
        maxLaunchAngle: '最大打球角度',
        exitVelVsLaunchAngle: '打球速度 vs 打球角度',
        hitDistribution: '打球分布',
        exitVelocity: '打球速度',
        launchAngle: '打球角度',
        distance: '飛距離',

        // Upload Page
        uploadDataTitle: 'データアップロード',
        selectDataFormat: 'データ形式を選択',
        rapsodo: 'Rapsodo',
        baseballSavant: 'Baseball Savant',
        fileType: 'ファイルタイプ',
        uploadCSVFile: 'CSVファイルをアップロード',
        dragAndDrop: 'CSVファイルをここにドラッグ&ドロップ',
        or: 'または',
        browseFiles: 'ファイルを選択',
        uploadDataButton: 'データをアップロード',
        dataPreview: 'データプレビュー（最初の10行）',
        successUpload: '正常にアップロードされました',
        rowsOf: '行の',
        data: 'データ',
        pleaseSelectFile: '最初にファイルを選択してください。',
        pleaseUploadCSV: 'CSVファイルをアップロードしてください。',
        failedToParse: 'CSVの解析に失敗しました',

        // Settings Page
        settingsTitle: '設定',
        languageSettings: '言語設定',
        selectLanguage: '言語を選択',
        english: 'English',
        japanese: '日本語',
        unitSettings: '単位設定',
        selectUnits: '単位を選択',
        imperial: 'ヤード・ポンド法 (mph, ft, in)',
        metric: 'メートル法 (km/h, m, cm)',
        currentSettings: '現在の設定',
        language: '言語',
        units: '単位',

        // Teams Page
        viewRoster: 'ロスターを見る',
        viewImportedData: 'インポートされたピッチング・バッティングデータを表示',
        goToDashboard: 'ダッシュボードへ',

        // Common
        loading: '読み込み中',
        loadingData: 'データを読み込み中...',
        loadingRapsodoData: 'Rapsodoデータを読み込み中...',
    }
};

// Helper function to get translated text
export const t = (key, lang = 'en') => {
    return translations[lang]?.[key] || translations.en[key] || key;
};
