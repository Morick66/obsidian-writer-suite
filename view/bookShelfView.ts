import { ItemView, WorkspaceLeaf, TFolder, TFile, Notice, parseYaml, ButtonComponent, MarkdownRenderer, TextComponent, Modal } from 'obsidian';
import MyPlugin from '../main';
import { WordCounter } from '../UtilityFunctions';

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
        // 添加浮动按钮
        const floatingButton = container.createEl('button', { text: '+', cls: 'floating-button' });
        floatingButton.title = '新建书籍';
        floatingButton.addEventListener('click', () => {
            this.showNewBookModal();
        });

        this.refresh();
    }

    async refresh() {
        const container = this.containerEl.children[1];
        const existingContent = container.querySelectorAll('.book-item, ul, p');
        existingContent.forEach(el => el.remove());

        const rootFolder = "/";
        const folder = this.app.vault.getAbstractFileByPath(rootFolder);
        if (folder && folder instanceof TFolder) {
            this.displayBooks(container, folder);
        } else {
            new Notice('Root folder not found or not a TFolder');
        }
    }

    async displayBooks(container: HTMLElement, rootFolder: TFolder) {
        for (const child of rootFolder.children) {
            if (child instanceof TFolder && child.name !== '@附件') {
                const infoFile = child.children.find(file => file instanceof TFile && file.name === '信息.md') as TFile;
                if (infoFile) {
                    const fileContents = await this.app.vault.read(infoFile);
                    const fileYaml = parseYaml(fileContents);

                    if (fileYaml.attributes === 'info') {
                        const novelFolder = child.children.find(file => file instanceof TFolder && file.name === '小说文稿') as TFolder;
                        const storyFile = child.children.find(file => file instanceof TFile && file.name === '小说正文.md') as TFile;
                        if (novelFolder) {
                            const totalWordCount = await this.wordCounter.getTotalWordCount(novelFolder);
                            this.displayBook(container, child, fileYaml.type, totalWordCount);
                        } else {
                            const totalWordCount = await this.wordCounter.getWordCount(storyFile);
                            this.displayBook(container, child, fileYaml.type, totalWordCount);
                        }
                    } 
                }
            }
        }
    }

    displayBook(container: HTMLElement, folder: TFolder, type: string, totalWordCount: number) {
        const bookItem = container.createDiv({ cls: 'book-item' });
        const bookTitle = bookItem.createEl('div', { cls: 'book-title', text: `${folder.name}` });
        const bookCount = bookItem.createEl('div', { cls: 'book-count', text: `${totalWordCount} 字` });
        const bookType = bookItem.createEl('div', { cls: 'book-type', text: type === 'novel' ? '长篇' : '短篇' });

        bookItem.addEventListener('click', () => {
            this.plugin.setFolderPath(folder.path);
            const novelFolderPath = `${this.plugin.folderPath}/小说文稿`;
            const novelFolder = this.app.vault.getAbstractFileByPath(novelFolderPath);
            if (novelFolder && novelFolder instanceof TFolder) {
                const latestFile = this.getLatestFile(novelFolder);
                if (latestFile) {
                    this.app.workspace.openLinkText(latestFile.path, '', false, { mode: 'source' });
                } else {
                    new Notice('未找到最新创建的文件');
                }
            } else {
                type === 'novel' ? this.app.workspace.openLinkText(this.plugin.folderPath + '/小说文稿/未命名章节.md', '', false, { mode: 'source' }) : this.app.workspace.openLinkText(this.plugin.folderPath + '/小说正文.md', '', false, { mode: 'source' });
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

    async showNewBookModal() {
        const rootFolderPath = this.plugin.folderPath + '/小说文稿';
        const folder = this.app.vault.getAbstractFileByPath(rootFolderPath);
        if (folder && folder instanceof TFolder) {
            const modal = new NewBookModal(this.app, folder, this);
            modal.open();
        } else {
            new Notice(`文件夹未发现: ${rootFolderPath}`);
        }
    }

    async onClose() {
        this.plugin.folderPath = '';
    }
}


// 新建条目的模态框
class NewBookModal extends Modal {
    folder: TFolder;
    view: BookshelfView;

    constructor(app: App, folder: TFolder, view: BookshelfView) {
        super(app);
        this.folder = folder;
        this.view = view;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', {cls: 'pluginModal', text: '新建条目' });

        const input = new TextComponent(contentEl);
        input.setPlaceholder('条目名称');

        new ButtonComponent(contentEl)
            .setButtonText('创建')
            .setCta()
            .onClick(async () => {
                const itemName = input.getValue();
                if (!itemName) {
                    new Notice('条目名称不能为空');
                    return;
                }

                const folderPath = `${this.folder.path}/${itemName}`;
                await this.app.vault.createFolder(folderPath);
                this.close();
                this.view.refresh();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}