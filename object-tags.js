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
                checkedKeys={checkedKeys}
                onCheck={onCheck}
                treeData={treeData}
                checkStrictly={true}
            />
        </div>
    );
};

// компонент для отображения выбранных тегов
const SelectedTags = ({ tags, currentTags, selectedToAdd, selectedToRemove }) => {
    // получаем теги для добавления
    const tagsToAdd = tags.filter(tag => 
        selectedToAdd.includes(tag.id) && !currentTags.includes(tag.id)
    );
    
    // получаем теги для удаления
    const tagsToRemove = tags.filter(tag => 
        selectedToRemove.includes(tag.id) && currentTags.includes(tag.id)
    );
    
    return (
        <div className="selected-tags">
            <div className="tags-section">
                <h3>Добавить теги:</h3>
                {tagsToAdd.length > 0 ? (
                    <ul>
                        {tagsToAdd.map(tag => (
                            <li key={tag.id}>{tag.name}</li>
                        ))}
                    </ul>
                ) : (
                    <p>Нет тегов для добавления</p>
                )}
            </div>
            
            <div className="tags-section">
                <h3>Удалить теги:</h3>
                {tagsToRemove.length > 0 ? (
                    <ul>
                        {tagsToRemove.map(tag => (
                            <li key={tag.id}>{tag.name}</li>
                        ))}
                    </ul>
                ) : (
                    <p>Нет тегов для удаления</p>
                )}
            </div>
        </div>
    );
};

// основной компонент страницы
const ObjectTagsPage = () => {
    const [tags, setTags] = React.useState([]);
    const [currentTags, setCurrentTags] = React.useState([]); // текущие теги объекта
    const [selectedToAdd, setSelectedToAdd] = React.useState([]); // теги для добавления
    const [selectedToRemove, setSelectedToRemove] = React.useState([]); // теги для удаления
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
                
                // преобразуем ссылки в ID тегов для работы с чекбоксами
                const currentTagIds = currentTags.map(tagRef => {
                    // если это уже reference, получаем id из path
                    if (tagRef && tagRef.path) {
                        return tagRef.path.split('/').pop();
                    }
                    // если это строка, получаем id из последней части
                    if (typeof tagRef === 'string') {
                        return tagRef.split('/').pop();
                    }
                    // если это DocumentReference, получаем id
                    if (tagRef && tagRef.id) {
                        return tagRef.id;
                    }
                    console.error('Неизвестный формат тега:', tagRef);
                    return null;
                }).filter(Boolean); // удаляем null значения
                
                setCurrentTags(currentTagIds);
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
        
        // получаем массив выбранных ключей
        const checked = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked || [];
        
        // определяем, какие теги добавляются, а какие удаляются
        const newSelectedToAdd = checked.filter(key => !currentTags.includes(key));
        const newSelectedToRemove = currentTags.filter(key => !checked.includes(key));
        
        setSelectedToAdd(newSelectedToAdd);
        setSelectedToRemove(newSelectedToRemove);
    };

    // обработчик сохранения тегов
    const handleSave = async () => {
        try {
            // формируем новый список тегов как ссылок на документы
            const newTags = [
                // сохраняем существующие теги как reference
                ...currentTags
                    .filter(tag => !selectedToRemove.includes(tag))
                    .map(tagId => db.doc(`tags/${tagId}`)),
                // добавляем новые теги как reference
                ...selectedToAdd.map(tagId => db.doc(`tags/${tagId}`))
            ];
            
            // обновляем теги объекта в Firestore
            await db.collection('sportobjects').doc(objectId).update({
                tags: newTags
            });
            
            // обновляем локальное состояние
            setCurrentTags(newTags.map(ref => ref.path.split('/').pop()));
            setSelectedToAdd([]);
            setSelectedToRemove([]);
            
            // показываем модальное окно с результатами
            const addedTags = tags
                .filter(tag => selectedToAdd.includes(tag.id))
                .map(tag => tag.name);
                
            const removedTags = tags
                .filter(tag => selectedToRemove.includes(tag.id))
                .map(tag => tag.name);
            
            showSuccessModal({
                added: addedTags,
                removed: removedTags
            });
            
        } catch (err) {
            console.error('Ошибка сохранения тегов:', err);
            antd.message.error('Ошибка сохранения тегов: ' + err.message);
        }
    };

    // функция отображения информационного окна
    const showSuccessModal = (changes) => {
        const modal = document.createElement('div');
        modal.className = 'info-modal';
        
        const content = document.createElement('div');
        content.className = 'info-modal-content';
        
        const title = document.createElement('h3');
        title.textContent = 'Теги успешно обновлены!';
        
        const message = document.createElement('div');
        message.className = 'changes-info';
        
        if (changes.added.length > 0) {
            const addedText = document.createElement('p');
            addedText.textContent = `Добавлены теги: ${changes.added.join(', ')}`;
            message.appendChild(addedText);
        }
        
        if (changes.removed.length > 0) {
            const removedText = document.createElement('p');
            removedText.textContent = `Удалены теги: ${changes.removed.join(', ')}`;
            message.appendChild(removedText);
        }
        
        const okButton = document.createElement('button');
        okButton.className = 'btn-ok';
        okButton.textContent = 'OK';
        okButton.onclick = () => modal.remove();
        
        content.appendChild(title);
        content.appendChild(message);
        content.appendChild(okButton);
        modal.appendChild(content);
        
        document.body.appendChild(modal);
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
                                checkedKeys={[...currentTags, ...selectedToAdd].filter(key => !selectedToRemove.includes(key))}
                                onCheck={handleCheck}
                            />
                        </div>
                        <div style={{ width: '300px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
                            <SelectedTags 
                                tags={tags}
                                currentTags={currentTags}
                                selectedToAdd={selectedToAdd}
                                selectedToRemove={selectedToRemove}
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