import { ItemView, WorkspaceLeaf, TFolder, TFile, Notice, Modal, TextComponent, ButtonComponent, App} from 'obsidian';
import MyPlugin from '../main';
import { WordCounter } from '../helper/WordCount';

export const VIEW_TYPE_FILE_LIST = 'file-list-view';
export const NEW_ITEM_MODAL = 'new-item-modal';

// 目录视图
export class TocView extends ItemView {
    plugin: MyPlugin;
    wordCounter: WordCounter;

    constructor(leaf: WorkspaceLeaf, plugin: MyPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.wordCounter = new WordCounter(plugin);
        this.icon = 'list';
    }

    getViewType(): string {
        return VIEW_TYPE_FILE_LIST;
    }

    getDisplayText(): string {
        return 'File List';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();

        const title = container.createEl('h2', { text: '' });
        
        title.className = 'view-title';
         // 创建浮动按钮并默认隐藏
        const floatingButton = container.createEl('button', { 
            text: '+', 
            cls: 'floating-button'
        });
        floatingButton.style.display = 'none';
        floatingButton.title = '新建章节/卷';
        floatingButton.addEventListener('click', () => {
            this.showNewItemModal();
        });

        // 根据 folderPath 初始化浮动按钮的显示状态
        this.toggleFloatingButton();
        this.refresh();
    }

    // 浮动按钮的显示
    toggleFloatingButton() {
        const floatingButton = this.containerEl.querySelector('.floating-button') as HTMLButtonElement;
        if (floatingButton) {
            floatingButton.style.display = this.plugin.folderPath !== "" ? 'block' : 'none';
        }
    }
    
    // 更新标题
    updateTitle() {
        const title = this.containerEl.querySelector('.view-title');
        if (title) {
            title.textContent = this.plugin.folderPath;
        }
        this.toggleFloatingButton();
    }

    async refresh() {
        const container = this.containerEl.children[1] as HTMLElement;
        const existingContent = container.querySelectorAll('.folder-item, ul, p');
        existingContent.forEach(el => el.remove());

        // 获取小说文稿文件夹路径，用于长篇小说
        const novelFolderPath = this.plugin.folderPath + '/小说文稿';
        const novelFolder = this.app.vault.getAbstractFileByPath(novelFolderPath);

        // 直接获取短篇小说文件路径
        const shortStoryFilePath = this.plugin.folderPath + '/小说正文.md';
        const shortStoryFile = this.app.vault.getAbstractFileByPath(shortStoryFilePath);

        if (novelFolder && novelFolder instanceof TFolder) {
            // 处理长篇小说的目录结构
            this.displayItems(container, novelFolder);
        } else if (shortStoryFile && shortStoryFile instanceof TFile) {
            // 如果是短篇小说，展示大纲
            this.displayOutline(container, shortStoryFile);
        }
        this.toggleFloatingButton();
    }

    displayItems(container: HTMLElement, folder: TFolder) {
        folder.children.forEach((child) => {
            const childContainer = container.createDiv({ cls: 'folder-item' });
            if (child instanceof TFile) {
                this.displayFile(childContainer, child);
            } else if (child instanceof TFolder) {
                this.displayFolder(childContainer, child);
            }
        });
    }

    displayFolder(container: HTMLElement, folder: TFolder) {
        const folderItem = container.createDiv({ cls: 'folder-item' });
        const folderHeader = folderItem.createEl('div', { cls: 'folder-header', text: folder.name });
        const tocButton = folderHeader.createEl('div', { cls: 'tocButton' });
        
        const addButton = tocButton.createEl('button', { text: '+' });

        const deleteButton = tocButton.createEl('button', { text: '×'});
        deleteButton.title = "删除文件夹";


        addButton.title = "New...";
        addButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showNewChapterModal(folder);
        });
        
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDelete(folder);
        });

        const fileList = folderItem.createEl('ul', { cls: 'file-list' });
        fileList.style.display = 'block';
        folderHeader.addEventListener('click', () => {
            fileList.style.display = fileList.style.display === 'none' ? 'block' : 'none';
        });

        const sortedChildren = folder.children.sort((a, b) => {
            if (a instanceof TFile && b instanceof TFile) {
                return a.stat.ctime - b.stat.ctime;
            } else if (a instanceof TFolder && b instanceof TFolder) {
                return a.name.localeCompare(b.name);
            } else {
                return a instanceof TFolder ? -1 : 1;
            }
        });

        sortedChildren.forEach(file => {
            if (file instanceof TFile) {
                this.displayFile(fileList, file);
            } else if (file instanceof TFolder) {
                this.displayFolder(fileList.createEl('li'), file);
            }
        });
    }

    async displayFile(container: HTMLElement, file: TFile) {
        const fileName = file.name.replace(/\.md$/, '');
        const fileItem = container.createEl('li', {cls: "chapter-title", text: `${fileName} (loading...)` });

        const wordCount = await this.wordCounter.getWordCount(file);
        fileItem.textContent = `${fileName} (${wordCount} 字)`;

        const deleteButton = fileItem.createEl('button', { text: '×', cls: 'deleteButton' });
        deleteButton.title = "删除文件";
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDelete(file);
        });

        fileItem.addEventListener('click', () => {
            this.app.workspace.openLinkText(file.path, '', false);
        });

        fileItem.dataset.path = file.path;
    }

    // 在 TocView 类中添加一个新的方法来展示大纲
    displayOutline(container: HTMLElement, file: TFile) {
        container.empty(); // 清空容器内容
        const outline = this.getOutline(file); // 假设这是获取文件大纲的方法
        const outlineList = container.createEl('ul', { cls: 'outline-list' });

        outline.then(titles => {
            titles.forEach(title => {
                outlineList.createEl('li', { text: title });
                // outlineItem.addEventListener('click', (e) => {
                //     e.stopPropagation();
                //     this.app.workspace.openLinkText(file.path, '', false);
                //     // 跳转到对应的标题位置
                //     const editor = this.app.workspace.activeLeaf.view.editor;
                //     const line = editor.getValue().split('\n').findIndex(line => line.includes(title));
                //     if (line !== -1) {
                //         editor.setCursor({ line, ch: 0 });
                //     }
                // });
            });
        });
    }
    async getOutline(file: TFile): Promise<string[]> {
        const fileContents = await this.app.vault.read(file);
        const lines = fileContents.split('\n');
        const titles = lines.filter(line => line.startsWith('#')).map(line => line.replace(/^#+\s*/, ''));
        return titles;
    }
    async updateFile(file: TFile) {
        const fileItem = this.containerEl.querySelector(`li[data-path="${file.path}"]`);
        if (fileItem) {
            const fileName = file.name.replace(/\.md$/, '');
            const wordCount = await this.wordCounter.getWordCount(file);
            fileItem.textContent = `${fileName} (${wordCount} words)`;
        }
    }

    async showNewChapterModal(folder: TFolder) {
        const modal = new NewChapterModal(this.app, folder, this);
        modal.open();
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
    
    confirmDelete(fileOrFolder: TFile | TFolder) {
        const modal = new ConfirmDeleteModal(this.app, fileOrFolder, this);
        modal.open();
    }

    async onClose() {
        // Clean up when view is closed, if necessary
    }
}

// 新建章节的模态框
export class NewChapterModal extends Modal {
    folder: TFolder;
    view: TocView;

    constructor(app: App, folder: TFolder, view: TocView) {
        super(app);
        this.folder = folder;
        this.view = view;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { cls: 'pluginModal', text: '新建章节' });

        const input = new TextComponent(contentEl);
        input.setPlaceholder('章节名称');

        new ButtonComponent(contentEl)
            .setButtonText('创建')
            .setCta()
            .onClick(async () => {
                const fileName = input.getValue();
                if (!fileName) {
                    new Notice('章节名称不能为空');
                    return;
                }

                const filePath = `${this.folder.path}/${fileName}.md`;
                await this.app.vault.create(filePath, '');
                this.close();
                this.view.refresh();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// 新建条目模态框
export class NewItemModal extends Modal {
    folder: TFolder;
    view: TocView;

    constructor(app: App, folder: TFolder, view: TocView) {
        super(app);
        this.folder = folder;
        this.view = view;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('p', { text: '新建卷/章节', cls: 'modal-title' });

        const nameInput = new TextComponent(contentEl);
        nameInput.setPlaceholder('输入卷/章节名称...');

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

// 删除确认的模态框
export class ConfirmDeleteModal extends Modal {
    fileOrFolder: TFile | TFolder;
    view: TocView;

    constructor(app: App, fileOrFolder: TFile | TFolder, view: TocView) {
        super(app);
        this.fileOrFolder = fileOrFolder;
        this.view = view;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { cls: 'pluginModal', text: '确认删除' });

        const fileType = this.fileOrFolder instanceof TFile ? '文件' : '文件夹';
        contentEl.createEl('p', { text: `你确定要删除这个${fileType}吗？` });

        new ButtonComponent(contentEl)
            .setButtonText('删除')
            .setCta()
            .onClick(async () => {
                await this.app.vault.trash(this.fileOrFolder, false);
                this.close();
                this.view.refresh();
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