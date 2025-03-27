import { Keyboard, SafeAreaView, ScrollView, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import { Text, Card } from '@rneui/themed'
import { useState } from 'react'
import Entypo from 'react-native-vector-icons/Entypo'
import AntDesign from 'react-native-vector-icons/AntDesign'
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6'
import DropDownPicker from 'react-native-dropdown-picker'

const Home = () => {
    const [selectedTime, setSelectedTime] = useState('3')
    const [memo, setMemo] = useState('')
    const [open, setOpen] = useState(false)
    const [timeOptions, setTimeOptions] = useState([
        { label: '1분', value: '1' },
        { label: '3분', value: '3' },
        { label: '5분', value: '5' },
        { label: '10분', value: '10' },
        { label: '1시간', value: '60' },
        { label: '12시간', value: '720' },
        { label: '24시간', value: '1440' },
    ])
    const [memoList, setMemoList] = useState([{ id: Date.now(), text: '', time: '1' }])
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
    const sortOptions = [
        { label: '등록 최신순', value: 'latest' },
        { label: '등록 오래된순', value: 'oldest' },
        { label: '삭제 임박순', value: 'urgent' },
        { label: '삭제 여유순', value: 'relaxed' },
    ]
    const [sortOpen, setSortOpen] = useState(false)
    const [selectedSort, setSelectedSort] = useState('latest')

    const onPressSave = () => {
        setOpen(false)
        setSortOpen(false)
        Keyboard.dismiss()
    }

    const onPressDelete = () => {
        setOpen(false)
        setSortOpen(false)
        Keyboard.dismiss()
    }

    const onPressNewCard = () => {
        setMemoList((prev) => [
            ...prev,
            { id: Date.now(), text: '', time: '1' }
        ])
    }

    const getSortedMemoList = () => {
        const list = [...memoList]
        switch (selectedSort) {
            case 'latest':
                return list.sort((a, b) => b.id - a.id)
            case 'oldest':
                return list.sort((a, b) => a.id - b.id)
            case 'urgent':
                return list.sort((a, b) => parseInt(a.time) - parseInt(b.time))
            case 'relaxed':
                return list.sort((a, b) => parseInt(b.time) - parseInt(a.time))
            default:
                return list
        }
    }

    const onFocusTextInput = () => {
        setOpen(false)
        setSortOpen(false)
    }

    const onPressFilter = () => {
        setSortOpen((prev) => !prev)
        setOpen(false)
        Keyboard.dismiss()
    }

    const onOpenDropdown = (index: number) => {
        setSelectedIndex(index)
        Keyboard.dismiss()
    }

    return (
        <TouchableWithoutFeedback
            onPress={() => {
                setOpen(false)
                setSortOpen(false)
                Keyboard.dismiss()
            }}
        >
            <SafeAreaView style={styles.safeContainer}>
                <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollViewContentContainer}>
                    <View style={styles.titleHeaderRow}>
                        <Text style={styles.title}>잠깐만 메모</Text>
                        <View style={{ position: 'relative'}}>
                            <TouchableOpacity onPress={onPressFilter}>
                                <FontAwesome6 name='sliders' size={25}/>
                            </TouchableOpacity>
                            {sortOpen && (
                                <View style={styles.sortDropdownWrapper}>
                                    <DropDownPicker 
                                        open={true}
                                        value={selectedSort}
                                        items={sortOptions}
                                        setOpen={() => setSortOpen(true)}
                                        setValue={setSelectedSort}
                                        setItems={(() => {})}
                                        style={{ display: 'none' }}
                                        dropDownContainerStyle={styles.sortDropdownContainer}
                                        textStyle={{ fontSize: 14 }}
                                        placeholder='정렬 선택'
                                        listMode='SCROLLVIEW'
                                        onClose={() => setSortOpen(false)}
                                        showArrowIcon={false}
                                    />
                                </View>
                            )}
                        </View>
                    </View>
                    {getSortedMemoList().map((memoItem, index) => (
                        <Card key={memoItem.id} containerStyle={[styles.card, {zIndex: selectedIndex === index ? 1000 : 1}]}>
                            <View style={styles.headerRow}>
                                <View style={styles.pickerContainer}>
                                    <View>
                                        <DropDownPicker 
                                            open={open && selectedIndex === index}
                                            value={memoItem.time}
                                            items={timeOptions}
                                            setOpen={setOpen}
                                            onOpen={() => onOpenDropdown(index)}
                                            onClose={() => setSelectedIndex(null)}
                                            setValue={(callback) => {
                                                const newList = [...memoList]
                                                newList[index].time = callback(memoItem.time)
                                                setMemoList(newList)
                                            }}
                                            setItems={setTimeOptions}
                                            style={styles.dropdown}
                                            dropDownContainerStyle={styles.dropdownContainer}
                                            textStyle={{ fontSize: 14 }}
                                            labelStyle={{ color: '#36454F' }}
                                            selectedItemLabelStyle={{ fontWeight: 'bold' }}
                                            placeholder="시간 선택"
                                            listMode="SCROLLVIEW"
                                            closeOnBackPressed={true}
                                        />
                                    </View>
                                    <Text style={{ color: '#36454F', marginTop: 12, marginLeft: 7}}>후 자동 삭제</Text>
                                </View>
                                <View style={styles.buttonGroup}>
                                    <TouchableOpacity onPress={onPressSave}>
                                        <Entypo name='save' size={25} color="#708090" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={onPressDelete}>
                                        <AntDesign name='delete' size={25} color="#CD5C5C" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <TextInput 
                                style={styles.memoInput}
                                multiline
                                placeholder='잠깐 기록할 메모를 입력하세요!'
                                value={memoItem.text}
                                onChangeText={(text) => {
                                    const newList = [...memoList]
                                    newList[index].text = text
                                    setMemoList(newList)
                                }}
                                onFocus={onFocusTextInput}
                            />
                        </Card>
                    ))}
                </ScrollView>
                <TouchableOpacity
                    style={styles.fab}
                    onPress={onPressNewCard}
                >
                    <FontAwesome6 name='plus' size={25} color="#DDD" />
                </TouchableOpacity>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    )
}

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: '#FFF',
        minHeight: '100%',
    },
    titleHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 30,
        paddingRight: 30,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    scrollViewContentContainer: {
        flexGrow: 1,
        marginTop: 20,
        paddingBottom: 50
    },
    card: {
        borderRadius: 8,
        padding: 15,
        borderColor: '#36454F',
        elevation: 5
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        paddingLeft: 10
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdown: {
        width: 110,
        height: 38,
        borderRadius: 6,
        borderColor: '#CCC',
        elevation: 3
    },
    dropdownContainer: {
        width: 110,
        borderColor: '#CCC',
        borderRadius: 6,
        elevation: 3,
    },
    memoInput: {
        height: 100,
        borderColor: '#DDD',
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        textAlignVertical: 'top',
        marginTop: 10,
        backgroundColor: '#FAFAFA',
        elevation: 3
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: 10, 
        paddingRight: 10, 
        marginTop: 10
    },
    fab: {
        position: 'absolute',
        right: 30,
        bottom: 30,
        backgroundColor: '#36454F',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    sortDropdownWrapper: {
        width: 150, 
        position: 'absolute', 
        top: 35, 
        right: -15, 
        zIndex: 9999
    },
    sortDropdownContainer: {
        borderColor: '#CCC', 
        zIndex: 9999, 
        elevation: 5, 
        borderRadius: 8
    }
})

export default Home