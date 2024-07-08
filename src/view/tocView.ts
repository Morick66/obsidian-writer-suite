import { ItemView, WorkspaceLeaf, TFolder, TFile, Notice, setIcon, MarkdownView} from 'obsidian';
import MyPlugin from '../main';
import { WordCounter } from '../helper/WordCount';
import { ConfirmDeleteModal } from '../model/deleteModal';
import { NewChapterModal } from 'src/model/newChapterModal';
import { NewItemModal } from 'src/model/newItemModal';

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
            cls: 'floating-button'
        });
        setIcon(floatingButton, 'plus');
        floatingButton.style.display = 'none';
        floatingButton.title = '新建章节/卷';
        floatingButton.addEventListener('click', () => {
            this.showNewItemModal();
        });

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
    }

    async refresh() {
        const container = this.containerEl.children[1] as HTMLElement;
        const existingContent = container.querySelectorAll('.folder-item, ul, p, .info-container');
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
            this.toggleFloatingButton();
        } else if (shortStoryFile && shortStoryFile instanceof TFile) {
            // 如果是短篇小说，展示大纲
            this.displayOutline(container, shortStoryFile);
        } else {
            this.displayInfo(container);
        }
    }
    displayInfo(container: HTMLElement) {
        const { settings } = this.plugin;
        const infoContainer = container.createDiv({ cls: 'info-container' });
    
        // 如果用户设置了图片路径，展示图片
        if (settings.picturePath) {
            const imagePath = `${settings.picturePath}`;
            infoContainer.createEl('img', {
                attr: { alt: imagePath, src: imagePath },
                cls: 'user-avatar'
            });
        }
    
        infoContainer.createEl('h1', { text: settings.name, cls: 'user-name' });
    
        this.getBookCountAndTotalWords().then(({ novelCount, shortStoryCount }) => {
            // 格式化显示文本
            const novelText = novelCount > 0 ? `${novelCount}` : "0";
            const shortStoryText = shortStoryCount > 0 ? `${shortStoryCount}` : "0";
    
            // 创建显示文本的div元素
            const infoText = [
                `长篇小说: ${novelText}`,
                `短篇小说: ${shortStoryText}`,
            ].join(' | ');
    
            infoContainer.createDiv({ text: infoText, cls: 'book-info' });
        });
    }
       

    // 异步方法，用于获取书籍数量和总字数
    async getBookCountAndTotalWords(): Promise<{ novelCount: number; shortStoryCount: number }> {
        const rootFolder = this.app.vault.getRoot(); // 获取根目录
        let novelCount = 0;
        let shortStoryCount = 0;

        const processFolder = async (folder: TFolder) => {
            for (const file of folder.children) {
                if (file instanceof TFile && file.path.endsWith('信息.md')) {
                    const content = await this.app.vault.read(file);
                    const type = this.getFileType(content); // 您需要实现这个方法来从内容中提取type
                    if (type === 'novel') novelCount++;
                    if (type === 'short-story') shortStoryCount++;
                } else if (file instanceof TFolder) {
                    await processFolder(file); // 递归处理子文件夹
                }
            }
        };

        await processFolder(rootFolder);
        return { novelCount, shortStoryCount };
    }

    // 辅助方法，从信息.md的内容中提取type
    getFileType(content: string): 'novel' | 'short-story' | null {
        const match = content.match(/type: (novel|short-story)/);
        return match ? match[1] as 'novel' | 'short-story' : null;
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
        const folderHeader = folderItem.createEl('div', { cls: 'folder-header' });
        const folderName = folderHeader.createEl('div',{cls: 'folder-name'});
        const folderIcon = folderName.createEl('span');
        setIcon(folderIcon, 'folder-open');
        folderName.createSpan({text: folder.name})
        
        const tocButton = folderHeader.createEl('div', { cls: 'tocButton' });
        
        const addButton = tocButton.createEl('button');
        setIcon(addButton, 'plus')

        const deleteButton = tocButton.createEl('button');
        setIcon(deleteButton, 'trash')
        deleteButton.title = "删除文件夹";


        addButton.title = "新建章节";
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
            if (fileList.style.display === 'none') {
                fileList.style.display = 'block'
                setIcon(folderIcon, 'folder-open');
            } else {
                fileList.style.display = 'none'
                setIcon(folderIcon, 'folder-minus');
            }
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
        const fileItem = container.createEl('li', {cls: "chapter-title" });
        const fileHeader = fileItem.createEl('div', { cls: 'file-header' });
        const fileIcon = fileHeader.createEl('span');
        setIcon(fileIcon, 'file-text');
        const fileName = fileHeader.createEl('span');
        const wordCount = await this.wordCounter.getWordCount(file);
        fileName.textContent = `${file.name.replace(/\.md$/, '')}`;

        const deleteButton = fileItem.createEl('button', { cls: 'deleteButton' });
        fileItem.createEl('div', { cls: 'word-count', text: `${wordCount}` });
        setIcon(deleteButton, 'trash')
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
    // 展示大纲的方法
    async displayOutline(container: HTMLElement, file: TFile) {
        const outline = await this.getOutline(file); // 获取文件大纲的方法
        this.renderOutlineList(container, outline, 1, file); // 根级别从1开始（即#）
    }

    // 递归渲染大纲列表的方法
    async renderOutlineList(container: HTMLElement, titles: string[], level: number, file: TFile) {
        const listType = level === 1 ? 'ul' : 'ol'; // 根级别使用无序列表，其他使用有序列表
        const list = container.createEl(listType, { cls: 'outline-list' });

        while (titles.length > 0) {
            const title = titles.shift();
            if (title) {
                const [text, nestedTitles] = this.splitTitleAndChildren(title, titles);

                // 创建包含标题文本的 div
                const titleDiv = list.createEl('div', { text });
                titleDiv.className = 'outline-title'; // 添加类名

                // 创建列表项，并将标题 div 添加为其子元素
                const listItem = list.createEl('li');
                listItem.appendChild(titleDiv);

                // 根据标题级别添加缩进效果
                listItem.style.paddingLeft = `${10}px`; // 为每个级别添加10px的缩进

                // 添加点击事件以定位到文件中的标题位置
                listItem.addEventListener('click', () => this.scrollToTitle(file, title));

                // 如果有子标题，递归渲染子标题列表
                if (nestedTitles.length > 0) {
                    this.renderOutlineList(listItem, nestedTitles, level + 1, file);
                }
            }
        }

        // 将当前列表项添加到容器中
        container.appendChild(list);
    }

    splitTitleAndChildren(title: string, remainingTitles: string[]): [string, string[]] {
        const match = title.match(/^(#+)\s*(.*)/);
        if (match) {
            const headerLevel = match[1].length;
            const text = match[2]; // 提取标题文本

            // 找出所有子标题
            const nestedTitles: string[] = [];
            for (let i = 0; i < remainingTitles.length; i++) {
                const nextTitle = remainingTitles[i];
                const nextMatch = nextTitle.match(/^(#+)\s*(.*)/);
                if (nextMatch) {
                    const nextHeaderLevel = nextMatch[1].length;
                    if (nextHeaderLevel > headerLevel) {
                        nestedTitles.push(nextTitle);
                    } else if (nextHeaderLevel <= headerLevel) {
                        break;
                    }
                }
            }

            // 从 remainingTitles 中移除已处理的子标题
            remainingTitles.splice(0, nestedTitles.length);

            return [text, nestedTitles];
        } else {
            // 如果没有匹配，返回原始标题文本和空的子标题数组
            return [title, []];
        }
    }

    // 定位到文件中的标题位置的方法
    async scrollToTitle(file: TFile, title: string) {
        const fileContent = await this.app.vault.read(file);
        const lines = fileContent.split('\n');
        const titleIndex = lines.findIndex(line => line.trim() === title);

        if (titleIndex !== -1) {
            const activeLeaf = this.app.workspace.getLeaf();
            if (activeLeaf) {
                const view = activeLeaf.view;
                if (view instanceof MarkdownView) {
                    const editor = view.editor;
                    editor.setCursor({ line: titleIndex, ch: 0 });

                    // 使用 scrollIntoView 选项参数
                    editor.scrollIntoView({ from: { line: titleIndex, ch: 0 }, to: { line: titleIndex, ch: 0 } }, true);
                }
            }
        }
    }

    // 假设的获取文件大纲的方法，需要您根据实际情况实现
    async getOutline(file: TFile): Promise<string[]> {
        const fileContents = await this.app.vault.read(file);
        const lines = fileContents.split('\n');
        const titles = lines.filter(line => line.startsWith('#')).map(line => line.trim());
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
        const modal = new NewChapterModal(this.app, folder, this, '章节' ,this.refresh);
        modal.open();
    }

    async showNewItemModal() {
        const rootFolderPath = this.plugin.folderPath + '/小说文稿';
        const folder = this.app.vault.getAbstractFileByPath(rootFolderPath);
        if (folder && folder instanceof TFolder) {
            const modal = new NewItemModal(this.app, folder, this, this.refresh);
            modal.open();
        } else {
            new Notice(`文件夹未发现: ${rootFolderPath}`);
        }
    }
    
    confirmDelete(fileOrFolder: TFile | TFolder) {
        const modal = new ConfirmDeleteModal(this.app, fileOrFolder, this, this.refresh);
        modal.open();
    }

    async onClose() {
        // Clean up when view is closed, if necessary
    }
}
