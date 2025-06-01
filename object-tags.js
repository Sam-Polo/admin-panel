// компонент для отображения иерархии тегов
const TagTree = ({ tags, checkedKeys, onCheck, isViewMode = false }) => {
    // преобразуем плоский список тегов в дерево для режима добавления
    const buildAddTree = (tags) => {
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

        // сортируем узлы
        const sortNodes = (nodes) => {
            nodes.sort((a, b) => a.name.localeCompare(b.name));
            nodes.forEach(node => {
                if (node.children.length > 0) {
                    sortNodes(node.children);
                }
            });
            return nodes;
        };

        return sortNodes(rootNodes);
    };

    // преобразуем плоский список тегов в дерево для режима просмотра
    const buildViewTree = (tags, currentTagIds) => {
        const tagMap = new Map();
        const rootNodes = [];

        // фильтруем только текущие теги объекта
        const currentTags = tags.filter(tag => currentTagIds.includes(tag.id));

        // создаем мапу тегов
        currentTags.forEach(tag => {
            tagMap.set(tag.id, {
                ...tag,
                children: []
            });
        });

        // строим дерево
        currentTags.forEach(tag => {
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

    const treeData = createTreeData(isViewMode ? buildViewTree(tags, checkedKeys) : buildAddTree(tags));

    return (
        <div className="ant-tree-wrapper" data-view-mode={isViewMode}>
            <antd.Tree
                checkable={!isViewMode}
                defaultExpandAll={isViewMode}
                defaultExpandedKeys={isViewMode ? undefined : treeData.map(node => node.key)}
                checkedKeys={checkedKeys}
                onCheck={onCheck}
                treeData={treeData}
                checkStrictly={true}
                selectable={false}
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
            <div className="tags-section add-tags">
                <h3>Добавить теги:</h3>
                {tagsToAdd.length > 0 ? (
                    <ul>
                        {tagsToAdd.map(tag => (
                            <li key={tag.id}>{tag.name}</li>
                        ))}
                    </ul>
                ) : (
                    <p>Теги для добавления не выбраны</p>
                )}
            </div>
            
            <div className="tags-section remove-tags">
                <h3>Удалить теги:</h3>
                {tagsToRemove.length > 0 ? (
                    <ul>
                        {tagsToRemove.map(tag => (
                            <li key={tag.id}>{tag.name}</li>
                        ))}
                    </ul>
                ) : (
                    <p>Теги для удаления не выбраны</p>
                )}
            </div>
        </div>
    );
};

// основной компонент страницы
const ObjectTagsPage = () => {
    const [tags, setTags] = React.useState([]);
    const [currentTags, setCurrentTags] = React.useState([]);
    const [selectedToAdd, setSelectedToAdd] = React.useState([]);
    const [selectedToRemove, setSelectedToRemove] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [objectName, setObjectName] = React.useState('');
    const [userEmail, setUserEmail] = React.useState('');
    const [activeTab, setActiveTab] = React.useState('add');

    // получаем id объекта из URL
    const objectId = new URLSearchParams(window.location.search).get('id');

    // загружаем все теги и теги объекта
    React.useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                
                // загружаем все теги с сортировкой по имени
                const tagsSnapshot = await db.collection('tags')
                    .orderBy('name')
                    .get();
                const tagsData = tagsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setTags(tagsData);

                // загружаем данные объекта
                const objectDoc = await db.collection('sportobjects').doc(objectId).get();
                const objectData = objectDoc.data();
                const currentTags = objectData.tags || [];
                
                // преобразуем ссылки в ID тегов
                const currentTagIds = currentTags.map(tagRef => {
                    if (tagRef && tagRef.path) {
                        return tagRef.path.split('/').pop();
                    }
                    if (typeof tagRef === 'string') {
                        return tagRef.split('/').pop();
                    }
                    if (tagRef && tagRef.id) {
                        return tagRef.id;
                    }
                    console.error('Неизвестный формат тега:', tagRef);
                    return null;
                }).filter(Boolean);
                
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
        
        const checked = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked || [];
        
        // получаем все дочерние теги для каждого тега
        const getChildTags = (tagId) => {
            const tag = tags.find(t => t.id === tagId);
            if (!tag) return [];
            
            const children = tags.filter(t => t.parent && t.parent.id === tagId);
            return [...children, ...children.flatMap(child => getChildTags(child.id))];
        };
        
        // получаем все родительские теги для каждого тега
        const getParentTags = (tagId) => {
            const tag = tags.find(t => t.id === tagId);
            if (!tag || !tag.parent) return [];
            
            return [tag.parent.id, ...getParentTags(tag.parent.id)];
        };

        // определяем, какие теги были добавлены, а какие удалены
        const addedTags = checked.filter(key => !currentTags.includes(key));
        const removedTags = currentTags.filter(key => !checked.includes(key));

        // проверяем, что все родительские теги выбраны только для новых тегов
        const newSelectedToAdd = [];
        const tagsToRemove = new Set(removedTags);

        // сначала обрабатываем удаление тегов
        removedTags.forEach(tagId => {
            const childTags = getChildTags(tagId);
            childTags.forEach(childId => {
                if (currentTags.includes(childId)) {
                    tagsToRemove.add(childId);
                }
            });
        });

        // проверяем все текущие теги объекта на наличие удаленных родителей
        currentTags.forEach(tagId => {
            const parentTags = getParentTags(tagId);
            const hasRemovedParent = parentTags.some(parentId => tagsToRemove.has(parentId));
            if (hasRemovedParent) {
                tagsToRemove.add(tagId);
            }
        });

        // теперь обрабатываем добавление новых тегов
        for (const key of addedTags) {
            // пропускаем теги, которые уже есть у объекта
            if (currentTags.includes(key)) continue;
            
            // проверяем родительские теги только для новых тегов
            const parentTags = getParentTags(key);
            const hasAllParents = parentTags.every(parentId => checked.includes(parentId));
            
            if (!hasAllParents) {
                const missingParent = parentTags.find(parentId => !checked.includes(parentId));
                const missingParentTag = tags.find(t => t.id === missingParent);
                antd.message.warning(`Сначала добавьте родительский тег: ${missingParentTag?.name}`);
                continue;
            }
            
            newSelectedToAdd.push(key);
        }
        
        setSelectedToAdd(newSelectedToAdd);
        setSelectedToRemove(Array.from(tagsToRemove));
    };

    // проверяем, есть ли изменения
    const hasChanges = selectedToAdd.length > 0 || selectedToRemove.length > 0;

    // обработчик сохранения тегов
    const handleSave = async () => {
        try {
            // проверяем, что все родительские теги добавлены
            const getParentTags = (tagId) => {
                const tag = tags.find(t => t.id === tagId);
                if (!tag || !tag.parent) return [];
                return [tag.parent.id, ...getParentTags(tag.parent.id)];
            };
            
            const allNewTags = [...currentTags, ...selectedToAdd].filter(key => !selectedToRemove.includes(key));
            const missingParents = selectedToAdd.flatMap(tagId => {
                const parentTags = getParentTags(tagId);
                return parentTags.filter(parentId => !allNewTags.includes(parentId));
            });
            
            if (missingParents.length > 0) {
                const missingParentNames = missingParents.map(id => tags.find(t => t.id === id)?.name).filter(Boolean);
                throw new Error(`Нельзя добавить тег без родительского тега. Отсутствуют: ${missingParentNames.join(', ')}`);
            }
            
            // проверяем, что все дочерние теги удалены
            const getChildTags = (tagId) => {
                const tag = tags.find(t => t.id === tagId);
                if (!tag) return [];
                const children = tags.filter(t => t.parent && t.parent.id === tagId);
                return [...children, ...children.flatMap(child => getChildTags(child.id))];
            };
            
            const remainingTags = currentTags.filter(tag => !selectedToRemove.includes(tag));
            const tagsWithChildren = selectedToRemove.filter(tagId => {
                const childTags = getChildTags(tagId);
                return childTags.some(childId => remainingTags.includes(childId));
            });
            
            if (tagsWithChildren.length > 0) {
                const tagNames = tagsWithChildren.map(id => tags.find(t => t.id === id)?.name).filter(Boolean);
                throw new Error(`Нельзя удалить родительский тег, пока не удалены все его дочерние теги: ${tagNames.join(', ')}`);
            }
            
            const newTags = [
                ...currentTags
                    .filter(tag => !selectedToRemove.includes(tag))
                    .map(tagId => db.doc(`tags/${tagId}`)),
                ...selectedToAdd.map(tagId => db.doc(`tags/${tagId}`))
            ];
            
            await db.collection('sportobjects').doc(objectId).update({
                tags: newTags
            });
            
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
        okButton.onclick = () => {
            modal.remove();
            window.location.href = 'index.html';
        };
        
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
                    <button onClick={() => window.history.back()} className="back-btn">Назад</button>
                </div>
            </header>

            <nav className="main-nav">
                <div className="nav-links">
                    <button 
                        className={`nav-btn ${activeTab === 'view' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('view')}
                    >
                        Просмотр тегов
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'add' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('add')}
                    >
                        Добавить теги
                    </button>
                </div>
            </nav>

            <div className="content">
                {activeTab === 'add' ? (
                    <div className="page active">
                        <div className="page-header">
                            <h2>Добавить теги</h2>
                            <button 
                                onClick={handleSave} 
                                className="btn-primary"
                                disabled={!hasChanges}
                            >
                                Сохранить
                            </button>
                        </div>
                        <div className="tags-container" style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <TagTree 
                                    tags={tags}
                                    checkedKeys={[...currentTags, ...selectedToAdd].filter(key => !selectedToRemove.includes(key))}
                                    onCheck={handleCheck}
                                />
                            </div>
                            <div style={{ width: '300px', padding: '20px', background: 'white', borderRadius: '8px' }}>
                                <SelectedTags 
                                    tags={tags}
                                    currentTags={currentTags}
                                    selectedToAdd={selectedToAdd}
                                    selectedToRemove={selectedToRemove}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="page active">
                        <div className="page-header">
                            <h2>Просмотр тегов</h2>
                        </div>
                        <div className="tags-container">
                            <TagTree 
                                tags={tags}
                                checkedKeys={currentTags}
                                isViewMode={true}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// инициализируем Ant Design
const antd = window.antd;

// рендерим приложение
ReactDOM.render(<ObjectTagsPage />, document.getElementById('root')); 