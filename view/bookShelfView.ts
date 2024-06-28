import { ItemView, WorkspaceLeaf, TFolder, TFile, Notice, parseYaml, ButtonComponent, TextComponent, Modal, App } from 'obsidian';
import MyPlugin from '../main';
import { WordCounter } from '../UtilityFunctions';

export const VIEW_TYPE_BOOKSHELF = 'bookshelf-view';

// 书架视图
export class BookshelfView extends ItemView {
    plugin: MyPlugin;
    wordCounter: WordCounter;
    bookListContainer: HTMLElement;

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

        // 创建书籍列表容器
        this.bookListContainer = container.createDiv({ cls: 'book-list-container' });

        await this.refresh();
    }

    async refresh() {
        console.log('刷新视图中，，，，');
        this.bookListContainer.empty(); // 仅清空书籍列表容器

        const rootFolder = "/";
        const folder = this.app.vault.getAbstractFileByPath(rootFolder);
        if (folder && folder instanceof TFolder) {
            await this.displayBooks(this.bookListContainer, folder);
        }
    }

    async showNewItemModal() {
        const rootFolderPath = this.plugin.folderPath + '/小说文稿';
        const folder = this.app.vault.getAbstractFileByPath(rootFolderPath);
        if (folder && folder instanceof TFolder) {
            const modal = new NewItemModal(this.app, folder, this);
            modal.open();
        } else {
            new Notice(`文件夹未发现: ${rootFolderPath}`);
        }
    }

    async displayBooks(container: HTMLElement, rootFolder: TFolder) {
        console.log('显示书籍...');
        const bookFolders = rootFolder.children.filter(child => child instanceof TFolder) as TFolder[];
        
        for (const folder of bookFolders) {
            const infoFile = folder.children.find(file => file instanceof TFile && file.name === '信息.md') as TFile;
            if (infoFile) {
                const fileContents = await this.app.vault.read(infoFile);
                const fileYaml = parseYaml(fileContents);
                const novelFolder = folder.children.find(file => file instanceof TFolder && file.name === '小说文稿') as TFolder;
                const storyFile = folder.children.find(file => file instanceof TFile && file.name === '小说正文.md') as TFile;
                if (novelFolder) {
                    const totalWordCount = await this.wordCounter.getTotalWordCount(novelFolder);
                    this.displayBook(container, folder, fileYaml.type, totalWordCount);
                } else if (storyFile) {
                    const totalWordCount = await this.wordCounter.getWordCount(storyFile);
                    this.displayBook(container, folder, fileYaml.type, totalWordCount);
                } else {
                    console.log(`小说文件夹未发现 ${folder.name}`);
                }
            }
        }
    }

    displayBook(container: HTMLElement, folder: TFolder, type: string, totalWordCount: number) {
        console.log(`展示图书: ${folder.name}`);
        const bookItem = container.createDiv({ cls: 'book-item' });
        bookItem.createEl('div', { cls: 'book-title', text: `${folder.name}` });
        bookItem.createEl('div', { cls: 'book-count', text: `${totalWordCount} 字` });
        bookItem.createEl('div', { cls: 'book-type', text: type === 'novel' ? '长篇' : '短篇' });

        bookItem.addEventListener('click', () => {
            this.plugin.setFolderPath(folder.path);
            const novelFolderPath = `${this.plugin.folderPath}/小说文稿`;
            const novelFolder = this.app.vault.getAbstractFileByPath(novelFolderPath);
            if (novelFolder && novelFolder instanceof TFolder) {
                const latestFile = this.getLatestFile(novelFolder);
                if (latestFile) {
                    this.app.workspace.openLinkText(latestFile.path, '', false);
                } else {
                    this.showNewItemModal();
                }
            } else {
                type === 'novel' ? this.app.workspace.openLinkText(this.plugin.folderPath + '/小说文稿/未命名章节.md', '', false) : this.app.workspace.openLinkText(this.plugin.folderPath + '/小说正文.md', '', false);
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
        const rootFolderPath = '/';
        const folder = this.app.vault.getAbstractFileByPath(rootFolderPath);
        if (folder && folder instanceof TFolder) {
            const modal = new NewBookModal(this.app, folder, this);
            modal.open();
        }
    }

    async onClose() {
        this.plugin.folderPath = '';
    }
}

// 新建图书
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
        contentEl.createEl('h2', { cls: 'pluginModal', text: '新建书籍' });

        const infoForm = contentEl.createDiv({ cls: 'info-form' });

        const namelabelEl = infoForm.createEl('div', { cls: 'name-label' });
        namelabelEl.createEl('div', { text: '书籍名称', cls: 'input-label' });
        const nameInput = new TextComponent(namelabelEl);
        nameInput.setPlaceholder('在此输入书籍名称');
        
        // 创建书籍类型下拉选择框
        const bookTypeLabel = namelabelEl.createEl('div', { text: "小说类型：", cls: 'option-label' });
        const selectEl = bookTypeLabel.createEl('select', { cls: 'book-type-select' });
        selectEl.id = 'bookType'; // 给 select 元素一个 ID

        // 创建 “长篇小说” 选项并添加到下拉选择框
        const novelOption = selectEl.createEl('option', {
            attr: { value: 'novel', selected: 'selected' } // 初始默认选中长篇小说
        });
        novelOption.textContent = '长篇小说';

        // 创建 “短篇小说” 选项并添加到下拉选择框
        const shortStoryOption = selectEl.createEl('option', { attr: { value: 'short-story' } });
        shortStoryOption.textContent = '短篇小说';

        // 为 select 元素设置一个 change 事件监听器，以便在用户选择不同的类型时更新状态
        selectEl.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement; 
            const selectedValue = target.value;
            console.log('用户选择了书籍类型：', selectedValue);
        });

        const desclabelEl = infoForm.createEl('div', { cls: 'desc-label' });
        desclabelEl.createEl('div', { text: '书籍简介', cls: 'input-label' });
        const descInputEl = desclabelEl.createEl('textarea', { cls: 'book-description-textarea' });
        descInputEl.placeholder = '请输入书籍简介';
        descInputEl.rows = 10;
        descInputEl.style.width = '100%';

        // 创建确认按钮
        new ButtonComponent(contentEl)
            .setButtonText('创建')
            .setCta()
            .onClick(async () => {
                const bookName = nameInput.getValue();
                const bookDesc = descInputEl.value;
                let bookType = 'novel';
                const selectedType = document.getElementById('bookType') as HTMLSelectElement;
                bookType = selectedType.value;
                // 验证书籍名称是否为空
                if (bookName.trim() === '') {
                    new Notice('书籍名称不能为空');
                    return;
                }

                const bookFolderPath = `${this.folder.path}/${bookName}`;
                const newFolder = await this.app.vault.createFolder(bookFolderPath);
                if (newFolder) {
                    await this.app.vault.create(newFolder.path + '/信息.md', `名称: ${bookName}\n类型: ${bookType}\n简介: ${bookDesc}`);
                    if (bookType === 'novel') {
                        const novelFolder = await this.app.vault.createFolder(newFolder.path + '/小说文稿');
                        await this.app.vault.create(novelFolder.path + '/未命名章节.md', ''); // 创建空章节
                    } else if (bookType === 'short-story') {
                        await this.app.vault.create(newFolder.path + '/小说正文.md', ''); // 创建空章节
                    }
                }

                new Notice('书籍已创建');
                this.view.refresh();
                this.close();
            });

        new ButtonComponent(contentEl)
            .setButtonText('取消')
            .onClick(() => {
                this.close();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class NewItemModal extends Modal {
    folder: TFolder;
    view: BookshelfView;

    constructor(app: App, folder: TFolder, view: BookshelfView) {
        super(app);
        this.folder = folder;
        this.view = view;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('p', { text: '新建', cls: 'modal-title' });

        const nameInput = new TextComponent(contentEl);
        nameInput.setPlaceholder('输入章节名称...');

        const createFolderButton = new ButtonComponent(contentEl);
        createFolderButton.setButtonText('新卷')
            .onClick(async () => {
                const name = nameInput.getValue();
                if (name) {
                    await this.app.vault.createFolder(`${this.folder.path}/${name}`);
                    new Notice(`Folder '${name}' created.`);
                    this.view.refresh();
                    this.close();
                }
            });

        const createFileButton = new ButtonComponent(contentEl);
        createFileButton.setButtonText('新章节')
            .onClick(async () => {
                const name = nameInput.getValue();
                if (name) {
                    const filePath = `${this.folder.path}/${name}.md`;
                    await this.app.vault.create(filePath, '');
                    new Notice(`File '${name}.md' created.`);
                    this.view.refresh();
                    this.close();
                }
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}