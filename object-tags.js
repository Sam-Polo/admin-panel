// компонент для отображения иерархии тегов
const TagTree = ({ tags, checkedKeys, onCheck }) => {
    // преобразуем плоский список тегов в дерево
    const buildTree = (tags) => {
        const tagMap = new Map();
        const rootNodes = [];

        // сначала создаем мапу всех тегов
        tags.forEach(tag => {
            tagMap.set(tag.id, {
                ...tag,
                children: []
            });
        });

        // строим дерево
        tags.forEach(tag => {
            const node = tagMap.get(tag.id);
            if (tag.parent) {
                const parent = tagMap.get(tag.parent.id);
                if (parent) {
                    parent.children.push(node);
                }
            } else {
                rootNodes.push(node);
            }
        });

        return rootNodes;
    };

    // рекурсивно создаем дерево для Ant Design Tree
    const createTreeData = (nodes) => {
        return nodes.map(node => ({
            key: node.id,
            title: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span>{node.name}</span>
                </div>
            ),
            children: node.children.length > 0 ? createTreeData(node.children) : undefined
        }));
    };

    const treeData = createTreeData(buildTree(tags));

    return (
        <div className="ant-tree-wrapper">
            <antd.Tree
                checkable
                defaultExpandAll
                checkedKeys={checkedKeys.checked}
                onCheck={onCheck}
                treeData={treeData}
                checkStrictly={true}
            />
        </div>
    );
};

// компонент для отображения выбранных тегов
const SelectedTags = ({ tags, selectedTagIds }) => {
    // убеждаемся, что selectedIds это массив
    const selectedIds = Array.isArray(selectedTagIds?.checked) ? selectedTagIds.checked : [];
    const selectedTags = tags.filter(tag => selectedIds.includes(tag.id));
    
    return (
        <div className="selected-tags">
            <h3>Выбранные теги:</h3>
            {selectedTags.length > 0 ? (
                <ul>
                    {selectedTags.map(tag => (
                        <li key={tag.id}>{tag.name}</li>
                    ))}
                </ul>
            ) : (
                <p>Нет выбранных тегов</p>
            )}
        </div>
    );
};

// основной компонент страницы
const ObjectTagsPage = () => {
    const [tags, setTags] = React.useState([]);
    const [objectTags, setObjectTags] = React.useState([]);
    const [selectedTags, setSelectedTags] = React.useState({ checked: [], halfChecked: [] });
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [objectName, setObjectName] = React.useState('');
    const [userEmail, setUserEmail] = React.useState('');

    // получаем id объекта из URL
    const objectId = new URLSearchParams(window.location.search).get('id');

    // загружаем все теги и теги объекта
    React.useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                
                // загружаем все теги
                const tagsSnapshot = await db.collection('tags').get();
                const tagsData = tagsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setTags(tagsData);

                // загружаем данные объекта
                const objectDoc = await db.collection('sportobjects').doc(objectId).get();
                const objectData = objectDoc.data();
                const currentTags = objectData.tags || [];
                setObjectTags(currentTags);
                setSelectedTags({ checked: currentTags, halfChecked: [] });
                setObjectName(objectData.name || '');

                // получаем email текущего пользователя
                const user = auth.currentUser;
                if (user) {
                    setUserEmail(user.email);
                }

            } catch (err) {
                console.error('Ошибка загрузки данных:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [objectId]);

    // обработчик изменения выбранных тегов
    const handleCheck = (checkedKeys) => {
        console.log('handleCheck вызван с:', checkedKeys);
        setSelectedTags(checkedKeys);
    };

    // обработчик сохранения тегов
    const handleSave = async () => {
        try {
            // обновляем теги объекта в Firestore
            await db.collection('sportobjects').doc(objectId).update({
                tags: selectedTags.checked || []
            });
            
            // обновляем локальное состояние
            setObjectTags(selectedTags.checked || []);
            
            // показываем уведомление с выбранными тегами
            const selectedTagNames = tags
                .filter(tag => (selectedTags.checked || []).includes(tag.id))
                .map(tag => tag.name)
                .join(', ');
            
            antd.message.info(`Выбраны теги: ${selectedTagNames}`);
        } catch (err) {
            console.error('Ошибка сохранения тегов:', err);
            antd.message.error('Ошибка сохранения тегов: ' + err.message);
        }
    };

    if (loading) {
        return <div className="loading">Загрузка...</div>;
    }

    if (error) {
        return <div className="error">Ошибка: {error}</div>;
    }

    return (
        <div className="container">
            <header>
                <div className="header-left">
                    <h1>Управление тегами объекта "{objectName}"</h1>
                </div>
                <div className="header-right">
                    <span className="user-email">{userEmail}</span>
                    <button onClick={() => window.history.back()} style={{ color: 'white' }}>Назад</button>
                </div>
            </header>

            <nav className="main-nav">
                <div className="nav-links">
                    <button className="nav-btn" data-page="view">Просмотр тегов</button>
                    <button className="nav-btn active" data-page="add">Добавить теги</button>
                </div>
            </nav>

            <div className="content">
                <div className="page active">
                    <div className="page-header">
                        <h2>Добавить теги</h2>
                        <button onClick={handleSave} className="btn-primary">Сохранить</button>
                    </div>
                    <div className="tags-container" style={{ display: 'flex', gap: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <TagTree 
                                tags={tags}
                                checkedKeys={selectedTags}
                                onCheck={handleCheck}
                            />
                        </div>
                        <div style={{ width: '300px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
                            <SelectedTags 
                                tags={tags}
                                selectedTagIds={selectedTags}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// инициализируем Ant Design
const antd = window.antd;

// рендерим приложение
ReactDOM.render(<ObjectTagsPage />, document.getElementById('root')); 