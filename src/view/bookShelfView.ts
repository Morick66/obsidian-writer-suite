import { ItemView, WorkspaceLeaf, TFolder, TFile, Notice, parseYaml, setIcon } from 'obsidian';
import MyPlugin from '../main';
import { WordCounter } from '../helper/WordCount';
import { ConfirmDeleteModal } from '../model/deleteModal';
import { NewBookModal } from '../model/newBookModal';

export const VIEW_TYPE_BOOKSHELF = 'bookshelf-view';

// 书架视图
export class BookshelfView extends ItemView {
    plugin: MyPlugin;
    wordCounter: WordCounter;

    constructor(leaf: WorkspaceLeaf, plugin: MyPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.wordCounter = new WordCounter(plugin);
        this.icon = 'book';
    }

    getViewType(): string {
        return VIEW_TYPE_BOOKSHELF;
    }

    getDisplayText(): string {
        return 'Bookshelf';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();

        // 创建书籍列表容器
        const bookList = this.containerEl.createDiv({ cls: 'book-list-container' });
        bookList.style.gridTemplateColumns = `repeat(${this.plugin.settings.booksPerRow}, 1fr)`
        this.toggleFloatingButton();
        await this.refresh();
    }
    toggleFloatingButton() {
        // 添加浮动按钮
        const floatingButton = this.containerEl.createEl('button', { cls: 'floating-button' });
        setIcon(floatingButton, 'plus');
        floatingButton.title = '新建书籍';
        floatingButton.addEventListener('click', () => {
            this.showNewBookModal();
        });
    }
    async refresh() {
        this.containerEl.empty(); // 仅清空书籍列表容器
        const bookListContainer = this.containerEl.createDiv({ cls: 'book-list-container' });
        
        bookListContainer.style.gridTemplateColumns = `repeat(${this.plugin.settings.booksPerRow}, 1fr)`;

        const rootFolder = "/";
        const folder = this.app.vault.getAbstractFileByPath(rootFolder);
        if (folder instanceof TFolder) {
            await this.displayBooks(bookListContainer, folder);
        } else {
            new Notice('根文件夹未找到');
        }
        this.toggleFloatingButton();
    }

    async displayBooks(container: HTMLElement, rootFolder: TFolder) {
        const bookFolders = rootFolder.children.filter(child => child instanceof TFolder) as TFolder[];
        
        for (const folder of bookFolders) {
            const infoFile = folder.children.find(file => file instanceof TFile && file.name === '信息.md') as TFile;
            if (infoFile) {
                try {
                    const fileContents = await this.app.vault.read(infoFile);
                    const yamlHeader = fileContents.split('---')[1]?.trim();
                    const fileYaml = parseYaml(yamlHeader);
                    if (fileYaml) {
                        const novelFolder = folder.children.find(file => file instanceof TFolder && file.name === '小说文稿') as TFolder;
                        const storyFile = folder.children.find(file => file instanceof TFile && file.name === '小说正文.md') as TFile;
                        if (novelFolder) {
                            const totalWordCount = await this.wordCounter.getTotalWordCount(novelFolder);
                            this.displayBook(container, folder, fileYaml.type, totalWordCount);
                        } else if (storyFile) {
                            const totalWordCount = await this.wordCounter.getWordCount(storyFile);
                            this.displayBook(container, folder, fileYaml.type, totalWordCount);
                        } else {
                            new Notice(`小说文件夹未发现 ${folder.name}`);
                        }
                    }
                } catch (error) {
                    new Notice('解析信息.md文件时出错');
                }
            }
        }
    }

    displayBook(container: HTMLElement, folder: TFolder, type: string, totalWordCount: number) {
        const bookItem = container.createDiv({ cls: 'book-item' });
        bookItem.createEl('div', { cls: 'book-title', text: folder.name });
        bookItem.createEl('div', { cls: 'book-count', text: `${totalWordCount} 字` });
        bookItem.createEl('div', { cls: 'book-type', text: type === 'novel' ? '长篇' : '短篇' });

        const deleteButton = bookItem.createEl('div', { text: '删除', cls: 'deleteButtonPlus' });
        setIcon(deleteButton, 'trash');
        deleteButton.title = "删除灵感";
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDelete(folder);
        });

        bookItem.addEventListener('click', () => {
            this.plugin.setFolderPath(folder.path);
            const novelFolderPath = `${this.plugin.folderPath}/小说文稿`;
            const novelFolder = this.app.vault.getAbstractFileByPath(novelFolderPath);
            if (novelFolder instanceof TFolder) {
                const latestFile = this.getLatestFile(novelFolder);
                if (latestFile) {
                    this.app.workspace.openLinkText(latestFile.path, '', false);
                } else {
                    new Notice('未发现最新文件');
                }
            } else {
                const defaultPath = type === 'novel' ? `${this.plugin.folderPath}/小说文稿/未命名章节.md` : `${this.plugin.folderPath}/小说正文.md`;
                this.app.workspace.openLinkText(defaultPath, '', false);
            }
        });
    }

    getLatestFile(folder: TFolder): TFile | null {
        let latestFile: TFile | null = null;
        let latestTime = 0;

        const checkFile = (file: TFile) => {
            if (file.stat.ctime > latestTime) {
                latestTime = file.stat.ctime;
                latestFile = file;
            }
        };

        const traverseFolder = (folder: TFolder) => {
            folder.children.forEach((child) => {
                if (child instanceof TFile) {
                    checkFile(child);
                } else if (child instanceof TFolder) {
                    traverseFolder(child);
                }
            });
        };

        traverseFolder(folder);
        return latestFile;
    }

    confirmDelete(fileOrFolder: TFile | TFolder) {
        const modal = new ConfirmDeleteModal(this.app, fileOrFolder, this, this.refresh.bind(this));
        modal.open();
    }

    async showNewBookModal() {
        const rootFolderPath = '/';
        const folder = this.app.vault.getAbstractFileByPath(rootFolderPath);
        if (folder instanceof TFolder) {
            const modal = new NewBookModal(this.app, folder, this, this.refresh.bind(this));
            modal.open();
        } else {
            new Notice('根文件夹未找到');
        }
    }
    async onClose() {
        this.plugin.folderPath = '';
    }
}