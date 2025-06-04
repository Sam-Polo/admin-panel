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
            // записываем изменения в историю
            const batch = db.batch();
            const timestamp = new Date();

            // создаем ссылки на теги
            const addedTagRefs = selectedToAdd.map(tagId => db.collection('tags').doc(tagId));
            const removedTagRefs = selectedToRemove.map(tagId => db.collection('tags').doc(tagId));

            // добавляем запись в историю
            const changeRef = db.collection('tag_changes').doc();
            batch.set(changeRef, {
                object_id: db.collection('sportobjects').doc(objectId),
                added_tags: addedTagRefs,
                deleted_tags: removedTagRefs,
                timestamp: timestamp,
                user_id: auth.currentUser.uid,
                user_email: auth.currentUser.email
            });

            // выполняем batch запись
            await batch.commit();
            
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

            // обновляем текущие теги
            setCurrentTags(prevTags => {
                const newTags = [...prevTags];
                // добавляем новые теги
                selectedToAdd.forEach(tagId => {
                    if (!newTags.includes(tagId)) {
                        newTags.push(tagId);
                    }
                });
                // удаляем теги
                return newTags.filter(tagId => !selectedToRemove.includes(tagId));
            });
            
            // очищаем выбранные теги
            setSelectedToAdd([]);
            setSelectedToRemove([]);
            
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
            // обновляем историю, если мы на вкладке истории
            if (activeTab === 'history') {
                loadTagHistory(objectId);
            }
        };
        
        content.appendChild(title);
        content.appendChild(message);
        content.appendChild(okButton);
        modal.appendChild(content);
        
        document.body.appendChild(modal);
    };

    // добавляем функцию загрузки истории
    const loadTagHistory = async (objectId) => {
        console.log('Загрузка истории для объекта:', objectId);
        const historyList = document.getElementById('history-list');
        if (!historyList) {
            console.error('Не найден элемент history-list');
            return;
        }
        
        try {
            const objectRef = db.collection('sportobjects').doc(objectId);
            console.log('Создан reference на объект:', objectRef.path);
            
            const query = db.collection('tag_changes')
                .where('object_id', '==', objectRef)
                .orderBy('timestamp', 'desc');
                
            console.log('Выполняем запрос...');
            const snapshot = await query.get();
            console.log('Получено документов:', snapshot.size);
            
            if (snapshot.empty) {
                console.log('История пуста');
                historyList.innerHTML = '<tr><td colspan="4" class="empty">История изменений пуста</td></tr>';
                return;
            }

            // отображаем историю
            historyList.innerHTML = '';
            let displayedCount = 0;
            
            // получаем значения фильтров
            const searchText = document.getElementById('tag-search')?.value.toLowerCase() || '';
            const dateFrom = document.getElementById('date-from')?.value ? new Date(document.getElementById('date-from').value) : null;
            const dateTo = document.getElementById('date-to')?.value ? new Date(document.getElementById('date-to').value) : null;
            
            // если указана дата "до", устанавливаем время на конец дня
            if (dateTo) {
                dateTo.setHours(23, 59, 59, 999);
            }
            
            for (const doc of snapshot.docs) {
                const data = doc.data();
                console.log('Обработка записи:', data);
                
                // получаем данные о тегах
                const addedTags = await Promise.all(
                    data.added_tags.map(ref => ref.get())
                );
                const deletedTags = await Promise.all(
                    data.deleted_tags.map(ref => ref.get())
                );
                
                // используем сохраненный email пользователя
                const userEmail = data.user_email || 'Неизвестный пользователь';
                
                console.log('Добавленные теги:', addedTags.length);
                console.log('Удаленные теги:', deletedTags.length);
                
                // функция для проверки фильтров
                const checkFilters = (tagName, timestamp) => {
                    // проверка поиска по названию тега
                    if (searchText && !tagName.toLowerCase().includes(searchText)) {
                        return false;
                    }
                    
                    // проверка даты
                    const changeDate = timestamp.toDate();
                    if (dateFrom && changeDate < dateFrom) {
                        return false;
                    }
                    if (dateTo && changeDate > dateTo) {
                        return false;
                    }
                    
                    return true;
                };
                
                // создаем строки для добавленных тегов
                for (const tagDoc of addedTags) {
                    if (tagDoc.exists) {
                        const tagName = tagDoc.data().name;
                        if (checkFilters(tagName, data.timestamp)) {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${formatDate(data.timestamp)}</td>
                                <td>${tagName}</td>
                                <td class="status-added">Добавлен</td>
                                <td>${userEmail}</td>
                            `;
                            historyList.appendChild(tr);
                            displayedCount++;
                        }
                    }
                }
                
                // создаем строки для удаленных тегов
                for (const tagDoc of deletedTags) {
                    if (tagDoc.exists) {
                        const tagName = tagDoc.data().name;
                        if (checkFilters(tagName, data.timestamp)) {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${formatDate(data.timestamp)}</td>
                                <td>${tagName}</td>
                                <td class="status-removed">Удален</td>
                                <td>${userEmail}</td>
                            `;
                            historyList.appendChild(tr);
                            displayedCount++;
                        }
                    }
                }
            }
            
            if (displayedCount === 0) {
                historyList.innerHTML = '<tr><td colspan="4" class="empty">Нет записей, соответствующих фильтрам</td></tr>';
            }
            
            console.log('Всего отображено записей:', displayedCount);

        } catch (error) {
            console.error('Ошибка загрузки истории:', error);
            historyList.innerHTML = '<tr><td colspan="4" class="error">Ошибка загрузки истории</td></tr>';
        }
    };

    // добавляем обработчики для фильтров
    React.useEffect(() => {
        if (activeTab === 'history') {
            const searchInput = document.getElementById('tag-search');
            const dateFromInput = document.getElementById('date-from');
            const dateToInput = document.getElementById('date-to');
            
            const handleFilterChange = () => {
                loadTagHistory(objectId);
            };
            
            if (searchInput) {
                searchInput.addEventListener('input', handleFilterChange);
            }
            if (dateFromInput) {
                dateFromInput.addEventListener('change', handleFilterChange);
            }
            if (dateToInput) {
                dateToInput.addEventListener('change', handleFilterChange);
            }
            
            // очищаем обработчики при размонтировании
            return () => {
                if (searchInput) {
                    searchInput.removeEventListener('input', handleFilterChange);
                }
                if (dateFromInput) {
                    dateFromInput.removeEventListener('change', handleFilterChange);
                }
                if (dateToInput) {
                    dateToInput.removeEventListener('change', handleFilterChange);
                }
            };
        }
    }, [activeTab, objectId]);

    // добавляем функцию форматирования даты
    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return date.toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // добавляем загрузку истории при переключении на вкладку
    React.useEffect(() => {
        if (activeTab === 'history') {
            loadTagHistory(objectId);
        }
    }, [activeTab, objectId]);

    // добавляем стили для таблицы
    const style = document.createElement('style');
    style.textContent = `
        .history-table th {
            color: #1a237e;
            font-weight: bold;
            padding: 12px;
        }
        .status-added {
            color: #2e7d32;
            font-weight: bold;
        }
        .status-removed {
            color: #c62828;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);

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
                    <button 
                        className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('history')}
                    >
                        История изменений
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
                ) : activeTab === 'view' ? (
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
                ) : (
                    <div className="page active">
                        <div className="page-header">
                            <h2>История изменений тегов</h2>
                        </div>
                        <div className="history-container">
                            <div className="filters">
                                <input 
                                    type="text" 
                                    id="tag-search" 
                                    placeholder="Поиск по тегу..."
                                    className="search-input"
                                />
                                <div className="date-filters">
                                    <input 
                                        type="date" 
                                        id="date-from" 
                                        className="date-input"
                                    />
                                    <input 
                                        type="date" 
                                        id="date-to" 
                                        className="date-input"
                                    />
                                </div>
                            </div>
                            <table className="history-table">
                                <thead>
                                    <tr>
                                        <th>Дата</th>
                                        <th>Тег</th>
                                        <th>Изменение</th>
                                        <th>Пользователь</th>
                                    </tr>
                                </thead>
                                <tbody id="history-list">
                                    <tr>
                                        <td colspan="4" className="loading">Загрузка истории...</td>
                                    </tr>
                                </tbody>
                            </table>
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