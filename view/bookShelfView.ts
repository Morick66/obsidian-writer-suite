import { ItemView, WorkspaceLeaf, TFolder, TFile, Notice, parseYaml, ButtonComponent, TextComponent, Modal, App } from 'obsidian';
import MyPlugin from '../main';
import {NewItemModal, TocView} from './tocView';
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
        const container = this.containerEl.children[1] as HTMLElement;
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

    async showNewItemModal() {
        const rootFolderPath = this.plugin.folderPath + '/小说文稿';
        const folder = this.app.vault.getAbstractFileByPath(rootFolderPath);
        if (folder && folder instanceof TFolder) {
            const modal = new NewItemModal(this.app, folder, new TocView(this.leaf, this.plugin));
            modal.open();
        } else {
            new Notice(`文件夹未发现: ${rootFolderPath}`);
        }
    }

    async displayBooks(container: HTMLElement, rootFolder: TFolder) {
        for (const child of rootFolder.children) {
            if (child instanceof TFolder) {
                const infoFile = child.children.find(file => file instanceof TFile && file.name === '信息.md') as TFile;
                if (infoFile) {
                    const fileContents = await this.app.vault.read(infoFile);
                    const fileYaml = parseYaml(fileContents);
                    const novelFolder = child.children.find(file => file instanceof TFolder && file.name === '小说文稿') as TFolder;
                    const storyFile = child.children.find(file => file instanceof TFile && file.name === '小说正文.md') as TFile;
                    if (novelFolder) {
                        const totalWordCount = await this.wordCounter.getTotalWordCount(novelFolder);
                        this.displayBook(container, child, fileYaml.type, totalWordCount);
                    } else if (storyFile) {
                        const totalWordCount = await this.wordCounter.getWordCount(storyFile);
                        this.displayBook(container, child, fileYaml.type, totalWordCount);
                    } else {
                        console.log(`小说文件夹未发现 ${child.name}`);
                    }
                }
            }
        }
    }

    displayBook(container: HTMLElement, folder: TFolder, type: string, totalWordCount: number) {
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
        contentEl.createEl('h2', {cls: 'pluginModal', text: '新建书籍' });

        const infoForm = contentEl.createDiv({ cls: 'info-form' });

        const namelabelEl = infoForm.createEl('div', {cls: 'name-label'});
        namelabelEl.createEl('div', {text: '书籍名称', cls: 'input-label' });
        const nameInput = new TextComponent(namelabelEl);
        nameInput.setPlaceholder('在此输入书籍名称');
        
        // 创建书籍类型下拉选择框
        const bookTypeLabel = namelabelEl.createEl('div', {text: "小说类型：", cls: 'option-label' });
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


        const desclabelEl = infoForm.createEl('div', {cls: 'desc-label'});
        desclabelEl.createEl('div', { text: '书籍简介', cls: 'input-label' });
        const descInputEl = desclabelEl.createEl('textarea', {cls: 'book-description-textarea'});
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
                let bookType = 'novel'; // 默认类型为长篇小说

                // 检查单选按钮并设置类型
                if (shortStoryOption.value === "short-story") {
                    bookType = 'short-story';
                }

                if (!bookName) {
                    new Notice('书籍名称不能为空');
                    return;
                }

                // 构建信息.md的内容
                const content = `type: ${bookType}\n书名: ${bookName}\n简介: ${bookDesc}\n`;

                // 使用正确的文件路径创建信息.md文件并写入内容
                // 确保路径是正确的，这里假设 'this.folder.path' 是书籍存放的文件夹路径
                const folderPath = `/${bookName}`;
                const infoFilePath = `${folderPath}/信息.md`;

                if (!bookName) {
                    new Notice('书籍名称不能为空');
                    return;
                }
        
                // 尝试创建文件夹
                try {
                    await this.app.vault.createFolder(folderPath);
                } catch (error) {
                    new Notice(`创建文件夹失败: ${error}`);
                    return;
                }
        
                // 尝试创建信息.md文件并写入内容
                try {
                    await this.app.vault.create(infoFilePath, content);
                } catch (error) {
                    new Notice(`创建文件失败: ${error}`);
                    return;
                }
        
                // 关闭模态框并刷新视图
                this.close();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}